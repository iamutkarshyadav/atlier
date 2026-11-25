import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getPromotions,
  evaluateCartPromotions,
  roundCurrency,
  type PromotionWithRules,
} from '@repo/supabase'

export const dynamic = 'force-dynamic'

interface CouponItemInput {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  categoryId?: string
  collectionIds?: string[]
}

export async function POST(req: NextRequest) {
  return handleEligibleCoupons(req)
}

export async function GET(req: NextRequest) {
  return handleEligibleCoupons(req)
}

async function handleEligibleCoupons(req: NextRequest) {
  try {
    let subtotal = 0
    let items: CouponItemInput[] = []
    let deliveryMode: 'direct' | 'try_on' = 'direct'
    let shippingFee = 99

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      subtotal = Number(body.subtotal) || 0
      items = Array.isArray(body.items) ? body.items : []
      deliveryMode = body.deliveryMode === 'try_on' ? 'try_on' : 'direct'
      shippingFee = Number(body.shippingFee) || (deliveryMode === 'try_on' ? 99 : 0)
    } else {
      const { searchParams } = new URL(req.url)
      subtotal = Number(searchParams.get('subtotal')) || 0
      deliveryMode = searchParams.get('deliveryMode') === 'try_on' ? 'try_on' : 'direct'
      shippingFee = Number(searchParams.get('shippingFee')) || (deliveryMode === 'try_on' ? 99 : 0)

      const itemsParam = searchParams.get('items')
      if (itemsParam) {
        try {
          items = JSON.parse(itemsParam)
        } catch {}
      }
    }

    const supabase = await createServerSupabaseClient()
    const activePromotions: PromotionWithRules[] = await getPromotions(supabase, {
      onlyActive: true,
    }).catch(() => [])

    const applicable: any[] = []
    const locked: any[] = []

    // Ensure we have pricing items to evaluate
    const pricingItems =
      items.length > 0
        ? items.map((itm) => ({
            productId: itm.productId,
            variantId: itm.variantId || `var-${itm.productId}`,
            quantity: Number(itm.quantity) || 1,
            unitPrice: Number(itm.unitPrice) || 0,
            costPrice: 0,
            categoryId: itm.categoryId,
            collectionIds: itm.collectionIds,
          }))
        : [
            {
              productId: 'synthetic-subtotal-item',
              variantId: 'synthetic-var',
              quantity: 1,
              unitPrice: subtotal,
              costPrice: 0,
            },
          ]

    for (const promo of activePromotions) {
      if (!promo.is_active) continue

      // Only evaluate public coupons
      const publicCoupons = (promo.coupons || []).filter(
        (c) => c.is_active && !c.is_single_use && !c.assigned_customer_email
      )

      for (const coupon of publicCoupons) {
        const minOrder = promo.min_order_subtotal ? Number(promo.min_order_subtotal) : 0
        const isMinMet = subtotal >= minOrder

        // Calculate hypothetical savings using pure pricing engine
        const evalResult = evaluateCartPromotions({
          items: pricingItems,
          deliveryMode,
          shippingFee,
          couponCode: coupon.code,
          activePromotions: [promo],
          activeCoupon: coupon,
        })

        const savingsAmount = evalResult.totalDiscount

        const baseCouponInfo = {
          id: coupon.id,
          code: coupon.code,
          promotionId: promo.id,
          promotionName: promo.name,
          description: promo.description,
          discountType: promo.discount_type,
          discountValue: Number(promo.discount_value),
          minOrderSubtotal: minOrder,
          maxDiscountAmount: promo.max_discount_amount ? Number(promo.max_discount_amount) : null,
          endsAt: promo.ends_at,
          badgeText:
            promo.discount_type === 'percentage'
              ? `${Math.round(Number(promo.discount_value))}% OFF`
              : promo.discount_type === 'free_shipping'
                ? 'FREE SHIPPING'
                : `₹${Math.round(Number(promo.discount_value))} OFF`,
        }

        if (isMinMet && evalResult.isValid && savingsAmount > 0) {
          applicable.push({
            ...baseCouponInfo,
            savingsAmount,
            savingsFormatted: `Save ₹${savingsAmount.toLocaleString('en-IN')}`,
          })
        } else {
          const amountNeeded = Math.max(0, minOrder - subtotal)
          locked.push({
            ...baseCouponInfo,
            savingsAmount,
            amountNeededToUnlock: roundCurrency(amountNeeded),
            unlockMessage:
              amountNeeded > 0
                ? `Add ₹${Math.round(amountNeeded).toLocaleString('en-IN')} more to unlock`
                : 'Not applicable to current cart items',
          })
        }
      }
    }

    // Sort applicable coupons by highest savings first
    applicable.sort((a, b) => b.savingsAmount - a.savingsAmount)

    return NextResponse.json({
      success: true,
      subtotal,
      applicable,
      locked,
      totalAvailable: applicable.length + locked.length,
    })
  } catch (err: any) {
    console.error('Error resolving eligible coupons:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to resolve eligible coupons' },
      { status: 500 }
    )
  }
}
