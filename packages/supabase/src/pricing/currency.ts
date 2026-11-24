/**
 * Exact Currency & Allocation Math (2 Decimal Places)
 * Protects against IEEE 754 floating-point drift and ensures pro-rata line item discounts
 * sum up exactly to the total discount without 1-paise variance.
 */

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export interface AllocatableItem {
  key: string
  amount: number
  maxDiscount: number
}

/**
 * Distributes a lump-sum discount across line items pro-rata by item amount,
 * clamping to maxDiscount per item and allocating any residual fraction (1-paise remainder)
 * to the highest-value eligible item.
 */
export function allocateProRataDiscounts(
  items: AllocatableItem[],
  totalDiscount: number
): Record<string, number> {
  const result: Record<string, number> = {}
  items.forEach((it) => {
    result[it.key] = 0
  })

  if (items.length === 0 || totalDiscount <= 0) {
    return result
  }

  const roundedTarget = roundCurrency(totalDiscount)
  const totalAmount = items.reduce((acc, it) => acc + it.amount, 0)

  if (totalAmount <= 0) {
    return result
  }

  // 1. First Pass: Compute raw proportional discounts rounded to 2 decimal places
  let allocatedSum = 0
  const candidateAllocations: Array<{ key: string; amount: number; discount: number; maxDiscount: number }> = []

  for (const it of items) {
    const proportion = it.amount / totalAmount
    const rawDiscount = proportion * roundedTarget
    let clamped = Math.min(rawDiscount, it.maxDiscount, it.amount)
    clamped = roundCurrency(Math.max(0, clamped))
    result[it.key] = clamped
    allocatedSum = roundCurrency(allocatedSum + clamped)

    candidateAllocations.push({
      key: it.key,
      amount: it.amount,
      discount: clamped,
      maxDiscount: it.maxDiscount,
    })
  }

  // 2. Second Pass: Distribute any remainder (e.g. +0.01 or -0.01) caused by rounding
  let remainder = roundCurrency(roundedTarget - allocatedSum)

  // Sort candidate items by highest amount first to receive remainder
  candidateAllocations.sort((a, b) => b.amount - a.amount)

  if (remainder > 0) {
    // Under-allocated: add 1-paise increments to highest items that have remaining margin
    while (remainder >= 0.0099 && candidateAllocations.length > 0) {
      let incremented = false
      for (const cand of candidateAllocations) {
        const current = result[cand.key] || 0
        if (current + 0.01 <= cand.maxDiscount && current + 0.01 <= cand.amount) {
          result[cand.key] = roundCurrency(current + 0.01)
          remainder = roundCurrency(remainder - 0.01)
          incremented = true
          if (remainder < 0.0099) break
        }
      }
      if (!incremented) break // Margin floor or item caps reached on all items
    }
  } else if (remainder < -0.0099) {
    // Over-allocated: deduct 1-paise increments from items with discount > 0
    while (remainder <= -0.0099 && candidateAllocations.length > 0) {
      let decremented = false
      for (const cand of candidateAllocations) {
        const current = result[cand.key] || 0
        if (current >= 0.01) {
          result[cand.key] = roundCurrency(current - 0.01)
          remainder = roundCurrency(remainder + 0.01)
          decremented = true
          if (remainder > -0.0099) break
        }
      }
      if (!decremented) break
    }
  }

  return result
}
