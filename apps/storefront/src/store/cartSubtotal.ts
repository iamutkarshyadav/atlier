import {
  BOLT_HOLD_FEE,
  BOLT_MAX_TRY_ON_ITEMS,
  STANDARD_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  GST_RATE,
  isFreeStandardShipping,
  resolveShippingFee,
  type PricingDeliveryMode,
} from '@repo/supabase/pricing'

export type DeliveryMode = PricingDeliveryMode

export {
  BOLT_HOLD_FEE,
  BOLT_MAX_TRY_ON_ITEMS,
  STANDARD_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  GST_RATE,
  isFreeStandardShipping,
  resolveShippingFee,
}

export const BOLT_TRY_ON_FEE = BOLT_HOLD_FEE

export interface ItemForCalculation {
  price: number
  quantity: number
}

/**
 * Calculates the cart subtotal: sum of (price * quantity) for all items.
 */
export function calculateSubtotal(items: ItemForCalculation[]): number {
  return items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0)
}

/**
 * Calculates GST at 12% of the taxable subtotal, rounded to 2 decimal places.
 */
export function calculateTax(subtotal: number): number {
  if (subtotal <= 0) return 0.0
  return Number((subtotal * GST_RATE).toFixed(2))
}

/**
 * Calculates shipping / Bolt hold fee using the shared pricing source of truth:
 * - ₹0 if subtotal <= 0
 * - ₹99 hold for Bolt Doorstep Try-On ('try_on')
 * - ₹0 for Standard Delivery ('direct') when pre-coupon subtotal >= ₹1,999, else ₹150
 */
export function calculateShippingFee(
  subtotal: number,
  deliveryMode: DeliveryMode = 'direct'
): number {
  return resolveShippingFee(subtotal, deliveryMode)
}

/**
 * Calculates estimated total: subtotal + shippingFee + tax.
 * Returns 0 if subtotal is 0.
 */
export function calculateEstimatedTotal(
  subtotal: number,
  shippingFee: number,
  tax: number
): number {
  if (subtotal <= 0) return 0.0
  return Number((subtotal + shippingFee + tax).toFixed(2))
}

/**
 * Calculates Bolt Try-On checkout figures:
 * Immediate charge is the flat ₹99 hold (credited toward kept items).
 * Cart subtotal is deferred as "Payable after Try-On".
 */
export function calculateBoltCheckoutFigures(subtotal: number) {
  if (subtotal <= 0) {
    return {
      immediateDue: 0.0,
      payableAfterTryOn: 0.0,
      bookingFee: 0.0,
    }
  }
  return {
    immediateDue: BOLT_HOLD_FEE,
    payableAfterTryOn: subtotal,
    bookingFee: BOLT_HOLD_FEE,
  }
}

/**
 * Aggregates all cart calculation metrics for a set of items and delivery mode.
 */
export function calculateCartTotals(
  items: ItemForCalculation[],
  deliveryMode: DeliveryMode = 'direct'
) {
  const subtotal = calculateSubtotal(items)
  const itemCount = items.reduce((acc, curr) => acc + curr.quantity, 0)
  const tax = calculateTax(subtotal)
  const shippingFee = calculateShippingFee(subtotal, deliveryMode)
  const estimatedTotal = calculateEstimatedTotal(subtotal, shippingFee, tax)

  return {
    subtotal,
    itemCount,
    tax,
    shippingFee,
    estimatedTotal,
  }
}
