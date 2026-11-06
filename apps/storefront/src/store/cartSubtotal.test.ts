import { describe, it, expect } from 'vitest'
import {
  calculateSubtotal,
  calculateTax,
  calculateShippingFee,
  calculateEstimatedTotal,
  calculateCartTotals,
  calculateBoltCheckoutFigures,
  BOLT_TRY_ON_FEE,
  BOLT_MAX_TRY_ON_ITEMS,
} from './cartSubtotal'

describe('Cart Subtotal & Financial Computations (Independent of UI)', () => {
  it('returns zero totals for an empty cart', () => {
    const totals = calculateCartTotals([])
    expect(totals.subtotal).toBe(0)
    expect(totals.itemCount).toBe(0)
    expect(totals.tax).toBe(0)
    expect(totals.shippingFee).toBe(0)
    expect(totals.estimatedTotal).toBe(0)
  })

  it('correctly calculates subtotal for multi-item cart with varying quantities', () => {
    const items = [
      { price: 185.0, quantity: 1 },
      { price: 420.0, quantity: 2 }, // 840.00
    ]
    const subtotal = calculateSubtotal(items)
    expect(subtotal).toBe(1025.0)
  })

  it('correctly computes 8% sales tax with 2-decimal precision', () => {
    expect(calculateTax(100)).toBe(8.0)
    expect(calculateTax(1025.0)).toBe(82.0)
    // Fractional cents rounding check: $59.99 * 0.08 = 4.7992 -> 4.80
    expect(calculateTax(59.99)).toBe(4.8)
  })

  it('applies correct white-glove shipping fee based on delivery mode', () => {
    // $25 for direct standard shipping
    expect(calculateShippingFee(500, 'direct')).toBe(25.0)
    // $45 for doorstep salon try_on
    expect(calculateShippingFee(500, 'try_on')).toBe(45.0)
    // $0 if cart is empty
    expect(calculateShippingFee(0, 'direct')).toBe(0.0)
    expect(calculateShippingFee(0, 'try_on')).toBe(0.0)
  })

  it('computes exact estimated total combining subtotal, delivery mode fee, and sales tax', () => {
    const items = [
      { price: 185.0, quantity: 1 },
      { price: 420.0, quantity: 2 }, // Subtotal: 1025.00
    ]

    // Direct mode: 1025 (subtotal) + 25 (direct shipping) + 82 (8% tax) = 1132.00
    const directTotals = calculateCartTotals(items, 'direct')
    expect(directTotals.subtotal).toBe(1025.0)
    expect(directTotals.itemCount).toBe(3)
    expect(directTotals.shippingFee).toBe(25.0)
    expect(directTotals.tax).toBe(82.0)
    expect(directTotals.estimatedTotal).toBe(1132.0)

    // Try-on mode: 1025 (subtotal) + 45 (try_on shipping) + 82 (8% tax) = 1152.00
    const tryOnTotals = calculateCartTotals(items, 'try_on')
    expect(tryOnTotals.shippingFee).toBe(45.0)
    expect(tryOnTotals.estimatedTotal).toBe(1152.0)
  })

  it('computes Bolt ⚡ Try-On figures: ₹99 booking convenience fee and deferred clothes total', () => {
    expect(BOLT_MAX_TRY_ON_ITEMS).toBe(5)
    expect(BOLT_TRY_ON_FEE).toBe(99.0)

    const figures = calculateBoltCheckoutFigures(4500)
    expect(figures.immediateDue).toBe(99.0)
    expect(figures.bookingFee).toBe(99.0)
    expect(figures.payableAfterTryOn).toBe(4500)

    const emptyFigures = calculateBoltCheckoutFigures(0)
    expect(emptyFigures.immediateDue).toBe(0)
    expect(emptyFigures.payableAfterTryOn).toBe(0)
  })
})

