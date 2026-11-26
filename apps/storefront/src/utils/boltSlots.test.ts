import { describe, expect, it } from 'vitest'
import { DEFAULT_BOLT_TIMESLOTS } from '@repo/supabase/utils'
import {
  getCustomerSlotAvailability,
  getIstDateOptions,
  resolveInitialBoltDateAndSlot,
} from './boltSlots'

describe('boltSlots IST scheduling helpers', () => {
  it('generates 3 consecutive IST dates starting from Today', () => {
    const dates = getIstDateOptions(new Date('2026-11-26T10:00:00Z'))
    expect(dates).toHaveLength(3)
    expect(dates[0]?.shortLabel).toBe('Today')
    expect(dates[1]?.shortLabel).toBe('Tomorrow')
    expect(dates[0]?.isoDate).toBe('2026-11-26')
    expect(dates[1]?.isoDate).toBe('2026-11-27')
    expect(dates[2]?.isoDate).toBe('2026-11-28')
  })

  it('auto-disables past slots for Today and advances to Tomorrow when all today slots closed', () => {
    // 23:00 IST on 2026-11-26 = 17:30 UTC
    const lateEveningUtc = new Date('2026-11-26T17:30:00Z')
    const todayCheck = getCustomerSlotAvailability(DEFAULT_BOLT_TIMESLOTS[0]!, 0, lateEveningUtc)
    expect(todayCheck.disabled).toBe(true)
    expect(todayCheck.statusText).toBe('Window closed')

    const initial = resolveInitialBoltDateAndSlot(DEFAULT_BOLT_TIMESLOTS, lateEveningUtc)
    expect(initial.dayOffset).toBe(1)
    expect(initial.slotId).toBe(DEFAULT_BOLT_TIMESLOTS[0]!.id)
  })

  it('maps customer-facing availability strings without ops jargon', () => {
    const morningUtc = new Date('2026-11-26T02:00:00Z') // 07:30 IST
    const openSlot = getCustomerSlotAvailability(
      { ...DEFAULT_BOLT_TIMESLOTS[0]!, max_daily_capacity: 12 },
      0,
      morningUtc
    )
    expect(openSlot).toEqual({ disabled: false, statusText: 'Available', tone: 'available' })

    const lowSlot = getCustomerSlotAvailability(
      { ...DEFAULT_BOLT_TIMESLOTS[0]!, max_daily_capacity: 2 },
      0,
      morningUtc
    )
    expect(lowSlot).toEqual({ disabled: false, statusText: 'Only 2 slots left', tone: 'limited' })

    const fullSlot = getCustomerSlotAvailability(
      { ...DEFAULT_BOLT_TIMESLOTS[0]!, max_daily_capacity: 0 },
      0,
      morningUtc
    )
    expect(fullSlot).toEqual({ disabled: true, statusText: 'Full', tone: 'full' })
  })
})
