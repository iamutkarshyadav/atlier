import { roundCurrency } from './currency'
import { evaluateCartPromotions } from './evaluateCartPromotions'
import type {
  TryOnReconciliationParams,
  TryOnReconciliationResult,
  LineItemDiscount,
} from './types'

/**
 * Reconciles doorstep Bolt 45-Min Doorstep Try-On settlements when a patron
 * keeps a subset of garments and returns the rest.
 *
 * Verifies if minimum order thresholds are maintained and computes exact
 * post-fitting apparel settlement with pro-rata discounts and 12% GST.
 */
export function recalculateTryOnSettlement(
  params: TryOnReconciliationParams
): TryOnReconciliationResult {
  const {
    originalAppliedPromotion,
    originalCouponCode,
    keptItems,
    rejectedItems,
    holdFeePaid = 0,
  } = params

  const keptSubtotal = roundCurrency(
    keptItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0)
  )
  const rejectedSubtotal = roundCurrency(
    rejectedItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0)
  )

  // 1. All Garments Rejected
  if (keptItems.length === 0) {
    return {
      keptSubtotal: 0,
      rejectedSubtotal,
      recalculatedDiscount: 0,
      thresholdMaintained: false,
      recalculatedTax: 0,
      finalPayable: 0,
      refundDue: 0,
      lineItems: [],
      reconciliationNotes: 'All garments returned on doorstep. No apparel charge due.',
    }
  }

  // 2. No Promotion Originally Applied
  if (!originalAppliedPromotion) {
    const tax = roundCurrency(keptSubtotal * 0.12)
    const lineItems: LineItemDiscount[] = keptItems.map((it) => ({
      variantId: it.variantId,
      productId: it.productId,
      quantity: it.quantity,
      originalUnitPrice: roundCurrency(it.unitPrice),
      unitDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalUnitPrice: roundCurrency(it.unitPrice),
      costPrice: roundCurrency(it.costPrice),
      marginFloorHit: false,
    }))

    return {
      keptSubtotal,
      rejectedSubtotal,
      recalculatedDiscount: 0,
      thresholdMaintained: true,
      recalculatedTax: tax,
      finalPayable: roundCurrency(keptSubtotal + tax),
      refundDue: 0,
      lineItems,
      reconciliationNotes: 'Standard retail pricing settled for retained garments.',
    }
  }

  // 3. Minimum Order Threshold Verification
  const minThreshold = originalAppliedPromotion.min_order_subtotal || 0
  const thresholdMaintained = keptSubtotal >= minThreshold

  if (!thresholdMaintained && minThreshold > 0) {
    // Retained subtotal dropped below minimum campaign threshold -> discount forfeited
    const tax = roundCurrency(keptSubtotal * 0.12)
    const lineItems: LineItemDiscount[] = keptItems.map((it) => ({
      variantId: it.variantId,
      productId: it.productId,
      quantity: it.quantity,
      originalUnitPrice: roundCurrency(it.unitPrice),
      unitDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalUnitPrice: roundCurrency(it.unitPrice),
      costPrice: roundCurrency(it.costPrice),
      marginFloorHit: false,
    }))

    return {
      keptSubtotal,
      rejectedSubtotal,
      recalculatedDiscount: 0,
      thresholdMaintained: false,
      recalculatedTax: tax,
      finalPayable: roundCurrency(keptSubtotal + tax),
      refundDue: 0,
      lineItems,
      reconciliationNotes: `Retained garments (₹${keptSubtotal.toLocaleString('en-IN')}) fell below minimum privilege threshold (₹${minThreshold.toLocaleString('en-IN')}). Standard retail rate applied.`,
    }
  }

  // 4. Threshold Maintained: Re-evaluate discount against retained items
  const evalResult = evaluateCartPromotions({
    items: keptItems,
    deliveryMode: 'try_on',
    shippingFee: 0, // Shipping/hold fee was settled upfront
    couponCode: originalCouponCode,
    activePromotions: [originalAppliedPromotion],
    activeCoupon: originalCouponCode
      ? {
          id: 'temp_coupon',
          promotion_id: originalAppliedPromotion.id,
          code: originalCouponCode.toUpperCase(),
          is_single_use: false,
          max_uses: null,
          times_used: 0,
          assigned_customer_email: null,
          is_active: true,
          created_at: new Date().toISOString(),
        }
      : null,
  })

  return {
    keptSubtotal,
    rejectedSubtotal,
    recalculatedDiscount: evalResult.totalDiscount,
    thresholdMaintained: true,
    recalculatedTax: evalResult.taxAmount,
    finalPayable: evalResult.payablePostFitting,
    refundDue: 0,
    lineItems: evalResult.lineItems,
    reconciliationNotes: `Privilege maintained. Pro-rata discount of ₹${evalResult.totalDiscount.toLocaleString('en-IN')} applied to retained garments.`,
  }
}
