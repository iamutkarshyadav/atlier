import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import {
  evaluateCartPromotions,
  resolveShippingFee,
  roundCurrency,
  type CartItemPricingInput,
} from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items = [],
      couponCode,
      deliveryMode = 'direct',
      customerEmail,
    } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty. Add garments to apply privileges.' },
        { status: 400 }
      )
    }

    const adminClient = createServiceRoleClient()

    // 1. Fetch Authoritative Prices & Costs for Items
    const productIds = Array.from(new Set(items.map((it: any) => it.productId || it.id))) as string[]

    const { data: dbProducts } = await adminClient
      .from('products')
      .select('id, title, price, cost_price, category_id')
      .in('id', productIds)

    const { data: dbVariants } = await adminClient
      .from('product_variants')
      .select('id, product_id, size, cost_price, price_override')
      .in('product_id', productIds)

    const productMap = new Map((dbProducts || []).map((p) => [p.id, p]))
    const variantMap = new Map((dbVariants || []).map((v) => [v.id, v]))

    const pricingInputs: CartItemPricingInput[] = items.map((it: any) => {
      const pid = it.productId || it.id
      const p = productMap.get(pid)
      const v = it.variantId ? variantMap.get(it.variantId) : undefined

      const unitPrice = v?.price_override ?? p?.price ?? it.price ?? 0
      const costPrice = v?.cost_price ?? p?.cost_price ?? 0

      return {
        productId: pid,
        variantId: it.variantId || v?.id || pid,
        title: it.title || p?.title,
        categoryId: p?.category_id || undefined,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Number(unitPrice),
        costPrice: Number(costPrice),
      }
    })

    // 2. Fetch Active Promotions
    const now = new Date().toISOString()
    const { data: activePromotions } = await adminClient
      .from('promotions')
      .select('*, rules:promotion_rules(*)')
      .eq('is_active', true)
      .lte('starts_at', now)

    const validPromotions = (activePromotions || []).filter(
      (p) => !p.ends_at || p.ends_at >= now
    )

    // 3. If Coupon Code Supplied, Validate Coupon Existence & Quota
    let activeCoupon: any = null
    let customerRedemptionsCount = 0

    if (couponCode && typeof couponCode === 'string') {
      const cleanCode = couponCode.trim().toUpperCase()
      const { data: couponRecord } = await adminClient
        .from('promotion_coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle()

      activeCoupon = couponRecord

      if (activeCoupon && customerEmail) {
        const { count } = await adminClient
          .from('promotion_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('promotion_id', activeCoupon.promotion_id)
          .eq('customer_email', customerEmail.toLowerCase().trim())
          .eq('status', 'applied')

        customerRedemptionsCount = count || 0
      }
    }

    // 4. Run Isomorphic Pricing Engine using authoritative pre-coupon subtotal for shipping
    const authoritativeSubtotal = roundCurrency(
      pricingInputs.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
    )
    const normalizedMode = deliveryMode === 'try_on' ? 'try_on' : 'direct'
    const authoritativeShippingFee = resolveShippingFee(authoritativeSubtotal, normalizedMode)

    const evalResult = evaluateCartPromotions({
      items: pricingInputs,
      deliveryMode: normalizedMode,
      shippingFee: authoritativeShippingFee,
      customerEmail,
      couponCode,
      activePromotions: validPromotions,
      activeCoupon,
      customerRedemptionsCount,
    })

    // 5. Sanitize Result (Never leak cost_price to storefront client!)
    const sanitizedLineItems = evalResult.lineItems.map((li) => ({
      variantId: li.variantId,
      productId: li.productId,
      quantity: li.quantity,
      originalUnitPrice: li.originalUnitPrice,
      unitDiscountAmount: li.unitDiscountAmount,
      totalDiscountAmount: li.totalDiscountAmount,
      finalUnitPrice: li.finalUnitPrice,
      marginFloorHit: li.marginFloorHit,
      appliedPromotionId: li.appliedPromotionId,
    }))

    return NextResponse.json({
      ...evalResult,
      lineItems: sanitizedLineItems,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error evaluating cart privileges' },
      { status: 500 }
    )
  }
}
