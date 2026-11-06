import { describe, it, expect } from 'vitest'
import { reconcileBoltDoorstepSession, type TryOnItemRecord } from './boltAccounting'

describe('Bolt Doorstep Try-On Accounting Engine', () => {
  it('deducts ₹99 advance deposit from kept items subtotal', () => {
    const items: TryOnItemRecord[] = [
      { id: '1', unit_price: 2499, quantity: 1, try_on_decision: 'kept' },
      { id: '2', unit_price: 1899, quantity: 1, try_on_decision: 'rejected' },
    ]

    const result = reconcileBoltDoorstepSession(items)

    expect(result.keptSubtotal).toBe(2499)
    expect(result.depositCredit).toBe(99)
    expect(result.finalPayable).toBe(2400) // 2499 - 99
    expect(result.keptCount).toBe(1)
    expect(result.rejectedCount).toBe(1)
    expect(result.pendingCount).toBe(0)
  })

  it('floors final payable at ₹0 when no items are kept', () => {
    const items: TryOnItemRecord[] = [
      { id: '1', unit_price: 2499, quantity: 1, try_on_decision: 'rejected' },
      { id: '2', unit_price: 1899, quantity: 1, try_on_decision: 'rejected' },
    ]

    const result = reconcileBoltDoorstepSession(items)

    expect(result.keptSubtotal).toBe(0)
    expect(result.depositCredit).toBe(0)
    expect(result.finalPayable).toBe(0)
    expect(result.keptCount).toBe(0)
    expect(result.rejectedCount).toBe(2)
  })

  it('correctly handles multi-quantity kept pieces', () => {
    const items: TryOnItemRecord[] = [
      { id: '1', unit_price: 1000, quantity: 2, try_on_decision: 'kept' }, // 2000
      { id: '2', unit_price: 500, quantity: 1, try_on_decision: 'kept' },   // 500
    ]

    const result = reconcileBoltDoorstepSession(items)

    expect(result.keptSubtotal).toBe(2500)
    expect(result.depositCredit).toBe(99)
    expect(result.finalPayable).toBe(2401) // 2500 - 99
    expect(result.keptCount).toBe(3)
  })

  it('handles kept item price lower than the booking fee without negative balance', () => {
    const items: TryOnItemRecord[] = [
      { id: '1', unit_price: 50, quantity: 1, try_on_decision: 'kept' },
    ]

    const result = reconcileBoltDoorstepSession(items, 99)

    expect(result.keptSubtotal).toBe(50)
    expect(result.depositCredit).toBe(50)
    expect(result.finalPayable).toBe(0) // Math.max(0, 50 - 99)
  })

  it('identifies pending items when customer has not finished trying on', () => {
    const items: TryOnItemRecord[] = [
      { id: '1', unit_price: 3000, quantity: 1, try_on_decision: 'pending' },
      { id: '2', unit_price: 1500, quantity: 1, try_on_decision: 'kept' },
    ]

    const result = reconcileBoltDoorstepSession(items)

    expect(result.pendingCount).toBe(1)
    expect(result.keptCount).toBe(1)
    expect(result.keptSubtotal).toBe(1500)
    expect(result.finalPayable).toBe(1401)
  })
})

