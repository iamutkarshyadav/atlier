import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { completeBoltTryOnReconciliation, voidOrderPromotionRedemption } from '@repo/supabase/utils'
import { recalculateTryOnSettlement, type CartItemPricingInput } from '@repo/supabase'
import type { PosPaymentMethod } from '@repo/supabase/types'

export const dynamic = 'force-dynamic'

interface DecisionItem {
  itemId: string
  decision: 'kept' | 'rejected'
  rejectionReason?: string
}

interface CompleteSessionPayload {
  orderId: string
  decisions: DecisionItem[]
  collectedPaymentMode?: PosPaymentMethod
  paymentRef?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Support authenticated couriers with local development fallback
    const courierId =
      user?.id ||
      (process.env.NODE_ENV !== 'production' ? 'd2000000-0000-0000-0000-000000000002' : null)

    if (!courierId) {
      return NextResponse.json(
        { error: 'Unauthorized: Courier authentication required to finalize session' },
        { status: 401 }
      )
    }

    const body: CompleteSessionPayload = await req.json()
    const { orderId, decisions, collectedPaymentMode = 'upi', paymentRef } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid orderId provided' },
        { status: 400 }
      )
    }

    if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
      return NextResponse.json(
        { error: 'Missing decisions array for try-on order items' },
        { status: 400 }
      )
    }

    // Call single authoritative PostgreSQL reconciliation RPC
    const serviceClient = createServiceRoleClient()

    // 1. Fetch Order and Line Items to check for Applied Promotions
    const { data: orderRecord } = await serviceClient
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .maybeSingle()

    const allRejected = decisions.every((d) => d.decision === 'rejected')

    // 2. If All Garments Rejected: Void Promotion Redemption so coupon is unburned
    if (allRejected && orderRecord?.promotion_id) {
      await voidOrderPromotionRedemption(serviceClient, orderId)
    } else if (orderRecord?.promotion_id && !allRejected) {
      // 3. Partial keep: Reconcile pro-rata privilege & verify minimum order threshold
      const { data: promo } = await serviceClient
        .from('promotions')
        .select('*, rules:promotion_rules(*)')
        .eq('id', orderRecord.promotion_id)
        .maybeSingle()

      if (promo) {
        const keptDecisions = decisions.filter((d) => d.decision === 'kept')
        const rejectedDecisions = decisions.filter((d) => d.decision === 'rejected')

        const keptItems: CartItemPricingInput[] = keptDecisions.map((kd) => {
          const item = orderRecord.items?.find((it: any) => it.id === kd.itemId)
          return {
            productId: item?.product_id || '',
            variantId: item?.variant_id || '',
            quantity: item?.quantity || 1,
            unitPrice: Number(item?.unit_price) || 0,
            costPrice: 0,
          }
        })

        const rejectedItems: CartItemPricingInput[] = rejectedDecisions.map((rd) => {
          const item = orderRecord.items?.find((it: any) => it.id === rd.itemId)
          return {
            productId: item?.product_id || '',
            variantId: item?.variant_id || '',
            quantity: item?.quantity || 1,
            unitPrice: Number(item?.unit_price) || 0,
            costPrice: 0,
          }
        })

        const reconResult = recalculateTryOnSettlement({
          originalSubtotal: Number(orderRecord.original_total || orderRecord.total) || 0,
          originalAppliedPromotion: promo,
          originalCouponCode: orderRecord.coupon_code || undefined,
          keptItems,
          rejectedItems,
          holdFeePaid: Number(orderRecord.shipping_fee) || 0,
        })

        // If threshold was breached, void redemption or update order notes
        if (!reconResult.thresholdMaintained) {
          await voidOrderPromotionRedemption(serviceClient, orderId)
          await serviceClient
            .from('orders')
            .update({
              discount_breakdown: { voided: true, reason: reconResult.reconciliationNotes },
              delivery_notes: `${orderRecord.delivery_notes || ''} [Doorstep Reconciliation: ${reconResult.reconciliationNotes}]`,
            })
            .eq('id', orderId)
        }
      }
    }

    const result = await completeBoltTryOnReconciliation(serviceClient, {
      orderId,
      decisions: decisions.map((d) => ({
        order_item_id: d.itemId,
        decision: d.decision === 'kept' ? 'kept' : 'rejected',
        rejection_reason:
          d.decision === 'rejected'
            ? d.rejectionReason || 'Customer rejected during doorstep fitting'
            : null,
      })),
      paymentMode: (collectedPaymentMode as PosPaymentMethod) || 'upi',
      paymentRef: paymentRef || null,
      courierId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete reconciliation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId,
      ...result.data,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('Error completing Bolt session:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
