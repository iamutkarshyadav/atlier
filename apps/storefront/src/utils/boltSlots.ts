import type { BoltTimeslot } from '@repo/supabase/types'

export interface IstDateOption {
  dayOffset: 0 | 1 | 2
  isoDate: string
  shortLabel: string
  subLabel: string
}

export interface SlotAvailability {
  disabled: boolean
  statusText: string
  tone: 'available' | 'limited' | 'full'
}

/**
 * Extract current date parts & time in Asia/Kolkata (IST, UTC+05:30).
 */
export function getIstParts(now: Date = new Date()): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
  }
}

/**
 * Returns 3 selectable IST fitting days: Today, Tomorrow, and Day + 2.
 */
export function getIstDateOptions(now: Date = new Date()): IstDateOption[] {
  const ist = getIstParts(now)
  const baseUtc = new Date(Date.UTC(ist.year, ist.month - 1, ist.day))

  const offsets: Array<0 | 1 | 2> = [0, 1, 2]
  return offsets.map((offset) => {
    const target = new Date(baseUtc.getTime() + offset * 86400000)
    const isoDate = target.toISOString().slice(0, 10)
    const dateLabel = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(target)

    return {
      dayOffset: offset,
      isoDate,
      shortLabel: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dateLabel,
      subLabel: dateLabel,
    }
  })
}

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const [hStr, mStr] = timeStr.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/**
 * Returns true if the slot's cutoff (or start) time has already passed today in IST.
 */
export function isBoltSlotPastToday(slot: BoltTimeslot, now: Date = new Date()): boolean {
  const ist = getIstParts(now)
  const nowMinutes = ist.hour * 60 + ist.minute
  const cutoffMinutes =
    parseTimeToMinutes(slot.cutoff_time) ?? parseTimeToMinutes(slot.slot_start)
  if (cutoffMinutes === null) return false
  return nowMinutes >= cutoffMinutes
}

/**
 * Computes customer-facing slot status without exposing internal ops capacity metrics.
 */
export function getCustomerSlotAvailability(
  slot: BoltTimeslot,
  dayOffset: 0 | 1 | 2,
  now: Date = new Date()
): SlotAvailability {
  if (dayOffset === 0 && isBoltSlotPastToday(slot, now)) {
    return { disabled: true, statusText: 'Window closed', tone: 'full' }
  }

  const capacity = Number(slot.max_daily_capacity ?? 0)
  if (capacity <= 0) {
    return { disabled: true, statusText: 'Full', tone: 'full' }
  }

  if (capacity <= 3) {
    return {
      disabled: false,
      statusText: `Only ${capacity} ${capacity === 1 ? 'slot' : 'slots'} left`,
      tone: 'limited',
    }
  }

  return { disabled: false, statusText: 'Available', tone: 'available' }
}

/**
 * Picks Today if at least one slot is open; otherwise automatically advances to Tomorrow.
 */
export function resolveInitialBoltDateAndSlot(
  slots: BoltTimeslot[],
  now: Date = new Date()
): { dayOffset: 0 | 1 | 2; slotId: string | null } {
  const openToday = slots.find((s) => !getCustomerSlotAvailability(s, 0, now).disabled)
  if (openToday) {
    return { dayOffset: 0, slotId: openToday.id }
  }
  const openTomorrow = slots.find((s) => !getCustomerSlotAvailability(s, 1, now).disabled)
  return {
    dayOffset: 1,
    slotId: openTomorrow?.id ?? slots[0]?.id ?? null,
  }
}
