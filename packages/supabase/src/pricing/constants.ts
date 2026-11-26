export type PricingDeliveryMode = 'direct' | 'try_on'

export const BOLT_HOLD_FEE = 99.0
export const BOLT_MAX_TRY_ON_ITEMS = 5
export const STANDARD_SHIPPING_FEE = 150.0
export const FREE_SHIPPING_THRESHOLD = 1999.0
export const GST_RATE = 0.12

/**
 * Returns true when pre-coupon subtotal qualifies for free standard express delivery.
 */
export function isFreeStandardShipping(subtotal: number): boolean {
  return Number.isFinite(subtotal) && subtotal >= FREE_SHIPPING_THRESHOLD
}

/**
 * Resolves authoritative shipping / doorstep hold fee from pre-coupon subtotal and delivery mode.
 * - Empty cart (subtotal <= 0): ₹0
 * - Bolt Doorstep Try-On ('try_on'): flat ₹99 hold (credited toward kept items)
 * - Standard Express ('direct'): ₹0 when subtotal >= ₹1,999, otherwise ₹150
 */
export function resolveShippingFee(
  subtotal: number,
  deliveryMode: PricingDeliveryMode = 'direct'
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return 0.0
  }
  if (deliveryMode === 'try_on') {
    return BOLT_HOLD_FEE
  }
  return isFreeStandardShipping(subtotal) ? 0.0 : STANDARD_SHIPPING_FEE
}
