'use client'

import React from 'react'
import { Sparkles, Crown, ArrowRight } from 'lucide-react'

export interface TierProgressProps {
  currentSpend: number
  nextTierSpend: number
  amountNeeded: number
  unlockedBenefit: string
  progressPercentage: number
}

export function LuxuryTierProgressBar({ tierProgress }: { tierProgress?: TierProgressProps | null }) {
  if (!tierProgress || tierProgress.amountNeeded <= 0) {
    return null
  }

  const { amountNeeded, unlockedBenefit, progressPercentage, currentSpend, nextTierSpend } = tierProgress

  return (
    <div className="p-3.5 rounded-lg border border-[#e5e7eb] bg-[#fdfbf7] space-y-2.5 font-sans">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#14293a] font-medium">
          <Sparkles className="h-3.5 w-3.5 text-[#b91c1c]" />
          <span>Private Client Tier Milestone</span>
        </div>
        <span className="text-[11px] font-mono text-[#6c7079]">
          ₹{currentSpend.toLocaleString('en-IN')} / ₹{nextTierSpend.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-[#e5e7eb] h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-[#b91c1c] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#6c7079]">
        <span>
          Add <strong className="text-[#14293a] font-semibold">₹{amountNeeded.toLocaleString('en-IN')}</strong> to unlock
        </span>
        <span className="text-[#b91c1c] font-medium flex items-center gap-1">
          {unlockedBenefit}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}
