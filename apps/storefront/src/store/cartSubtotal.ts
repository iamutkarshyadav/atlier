export type DeliveryMode = 'direct' | 'try_on'

export const BOLT_TRY_ON_FEE = 99.0 // ₹99 nominal doorstep try-on booking/convenience fee
export const BOLT_MAX_TRY_ON_ITEMS = 5 // Maximum 5 items per Bolt Doorstep Salon session

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
 * Calculates tax at 8% of the subtotal, rounded to 2 decimal places.
 */
export function calculateTax(subtotal: number): number {
  return Number((subtotal * 0.08).toFixed(2))
}

/**
 * Calculates shipping fee:
 * - $0 if subtotal is 0
 * - $45 for try_on (Doorstep Salon)
 * - $25 for direct (Standard White-Glove)
 */
export function calculateShippingFee(subtotal: number, deliveryMode: DeliveryMode = 'direct'): number {
  if (subtotal === 0) return 0.0
  return deliveryMode === 'try_on' ? 45.0 : 25.0
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
  if (subtotal === 0) return 0.0
  return Number((subtotal + shippingFee + tax).toFixed(2))
}

/**
 * Calculates Bolt Try-On checkout figures:
 * Immediate charge is the flat ₹99 booking fee.
 * Cart subtotal is deferred as "Payable after Try-On".
 */
export function calculateBoltCheckoutFigures(subtotal: number) {
  if (subtotal === 0) {
    return {
      immediateDue: 0.0,
      payableAfterTryOn: 0.0,
      bookingFee: 0.0,
    }
  }
  return {
    immediateDue: BOLT_TRY_ON_FEE,
    payableAfterTryOn: subtotal,
    bookingFee: BOLT_TRY_ON_FEE,
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

