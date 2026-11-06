import type { TryOnDecision } from '../types/database.types'

export interface TryOnItemRecord {
  id: string
  unit_price: number
  quantity?: number
  try_on_decision: TryOnDecision
}

export const BOLT_TRY_ON_DEPOSIT = 99.0

export interface BoltReconciliationResult {
  keptSubtotal: number
  depositCredit: number
  finalPayable: number
  keptCount: number
  rejectedCount: number
  pendingCount: number
}

/**
 * Calculates authoritative financial reconciliation for a Bolt doorstep try-on session.
 * Net payable = Math.max(0, SUM(kept_items) - 99 deposit)
 */
export function reconcileBoltDoorstepSession(
  items: TryOnItemRecord[],
  depositPaid: number = BOLT_TRY_ON_DEPOSIT
): BoltReconciliationResult {
  let keptSubtotal = 0
  let keptCount = 0
  let rejectedCount = 0
  let pendingCount = 0

  for (const item of items) {
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1
    const price = Number(item.unit_price) || 0

    if (item.try_on_decision === 'kept') {
      keptCount += qty
      keptSubtotal += price * qty
    } else if (item.try_on_decision === 'rejected') {
      rejectedCount += qty
    } else {
      pendingCount += qty
    }
  }

  const depositCredit = Math.min(depositPaid, keptSubtotal)
  const finalPayable = Math.max(0, keptSubtotal - depositPaid)

  return {
    keptSubtotal,
    depositCredit,
    finalPayable,
    keptCount,
    rejectedCount,
    pendingCount,
  }
}

