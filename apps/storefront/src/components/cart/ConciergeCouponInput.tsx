'use client'

import React, { useState } from 'react'
import { Tag, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@repo/ui'
import { useHydratedCart } from '../../store/useCartStore'
import { ApplyCouponModal } from './ApplyCouponModal'

export function ConciergeCouponInput() {
  const {
    appliedCouponCode,
    pricingEvaluation,
    appliedPromotions,
    isValidatingPromotion,
    promotionError,
    applyCouponCode,
    removeCouponCode,
  } = useHydratedCart()

  const [inputCode, setInputCode] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCode.trim()) return
    await applyCouponCode(inputCode.trim())
    setInputCode('')
  }

  const appliedGarmentPromo = appliedPromotions.find((p: any) => !p.isShippingWaiver)
  const appliedShippingWaiver = appliedPromotions.find((p: any) => p.isShippingWaiver)

  return (
    <div className="p-4 rounded-lg border border-[#e5e7eb] bg-white space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-[#b91c1c]" />
          Private Client Privilege
        </span>
        {appliedCouponCode && (
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
            Privilege Active
          </span>
        )}
      </div>

      {appliedCouponCode ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 bg-[#fdfbf7] border border-[#e5e7eb] rounded text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-wider text-[#14293a]">
                  {appliedCouponCode}
                </span>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-[#6c7079]">
                {appliedGarmentPromo?.name || appliedShippingWaiver?.name || 'Exclusive privilege unlocked'}
              </p>
            </div>

            <button
              onClick={removeCouponCode}
              className="text-[#6c7079] hover:text-[#b91c1c] transition-colors p-1 cursor-pointer"
              title="Remove privilege"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pricingEvaluation?.totalDiscount > 0 && (
            <p className="text-[11px] text-emerald-700 font-mono">
              Total Privilege Savings: ₹{pricingEvaluation.totalDiscount.toLocaleString('en-IN')}
            </p>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-2xs font-mono text-[#6c7079] hover:text-[#14293a] underline pt-0.5 cursor-pointer block"
          >
            Change / View other available coupons
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Invitation Code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              disabled={isValidatingPromotion}
              className="flex-1 px-3 py-1.5 text-xs font-mono tracking-wider uppercase border border-[#d3d6db] rounded focus:outline-none focus:border-[#14293a]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputCode.trim() || isValidatingPromotion}
              className="text-xs font-mono bg-[#14293a] text-white hover:bg-black px-4"
            >
              {isValidatingPromotion ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-mono font-bold text-[#b91c1c] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View All Offers / Apply Coupon →</span>
            </button>
          </div>

          {promotionError && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#b91c1c] font-sans pt-0.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{promotionError}</span>
            </div>
          )}
        </form>
      )}

      <ApplyCouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
