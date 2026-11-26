import { describe, it, expect } from 'vitest'
import {
  calculateSubtotal,
  calculateTax,
  calculateShippingFee,
  calculateEstimatedTotal,
  calculateCartTotals,
  calculateBoltCheckoutFigures,
  BOLT_HOLD_FEE,
  BOLT_TRY_ON_FEE,
  BOLT_MAX_TRY_ON_ITEMS,
  STANDARD_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
} from './cartSubtotal'

describe('Cart Subtotal & Financial Computations (Single Source of Truth)', () => {
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
      { price: 499.0, quantity: 1 },
      { price: 500.0, quantity: 2 }, // 1000.00
    ]
    const subtotal = calculateSubtotal(items)
    expect(subtotal).toBe(1499.0)
  })

  it('correctly computes 12% GST with 2-decimal precision', () => {
    expect(calculateTax(100)).toBe(12.0)
    expect(calculateTax(1025.0)).toBe(123.0)
    // 59.99 * 0.12 = 7.1988 -> 7.20
    expect(calculateTax(59.99)).toBe(7.2)
  })

  it('enforces ₹150 standard shipping below ₹1,999, free at/above ₹1,999, and ₹99 Bolt hold', () => {
    expect(STANDARD_SHIPPING_FEE).toBe(150.0)
    expect(FREE_SHIPPING_THRESHOLD).toBe(1999.0)
    expect(BOLT_HOLD_FEE).toBe(99.0)

    // Standard shipping below threshold
    expect(calculateShippingFee(500, 'direct')).toBe(150.0)
    expect(calculateShippingFee(1998.99, 'direct')).toBe(150.0)
    // Free standard shipping at and above threshold
    expect(calculateShippingFee(1999, 'direct')).toBe(0.0)
    expect(calculateShippingFee(3500, 'direct')).toBe(0.0)
    // Bolt Try-On flat ₹99 hold regardless of threshold
    expect(calculateShippingFee(500, 'try_on')).toBe(99.0)
    expect(calculateShippingFee(3500, 'try_on')).toBe(99.0)
    // ₹0 if cart is empty
    expect(calculateShippingFee(0, 'direct')).toBe(0.0)
    expect(calculateShippingFee(0, 'try_on')).toBe(0.0)
  })

  it('computes exact estimated total combining subtotal, delivery mode fee, and 12% GST', () => {
    const belowThreshold = [
      { price: 500.0, quantity: 1 },
      { price: 500.0, quantity: 1 }, // Subtotal: 1000.00
    ]

    // Direct mode below ₹1,999: 1000 + 150 + 120 (12% GST) = 1270.00
    const directTotals = calculateCartTotals(belowThreshold, 'direct')
    expect(directTotals.subtotal).toBe(1000.0)
    expect(directTotals.itemCount).toBe(2)
    expect(directTotals.shippingFee).toBe(150.0)
    expect(directTotals.tax).toBe(120.0)
    expect(directTotals.estimatedTotal).toBe(1270.0)

    // Try-on mode: 1000 + 99 + 120 = 1219.00
    const tryOnTotals = calculateCartTotals(belowThreshold, 'try_on')
    expect(tryOnTotals.shippingFee).toBe(99.0)
    expect(tryOnTotals.estimatedTotal).toBe(1219.0)

    // Direct mode at/above ₹1,999: 2000 + 0 + 240 = 2240.00
    const freeTotals = calculateCartTotals([{ price: 2000, quantity: 1 }], 'direct')
    expect(freeTotals.shippingFee).toBe(0.0)
    expect(freeTotals.tax).toBe(240.0)
    expect(freeTotals.estimatedTotal).toBe(2240.0)
  })

  it('computes Bolt Try-On figures: ₹99 hold fee and deferred clothes total', () => {
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
