'use client'

import React, { useState, useEffect } from 'react'
import { Tag, Check, X, Loader2, Sparkles, AlertCircle, Lock, ArrowRight } from 'lucide-react'
import { useHydratedCart } from '../../store/useCartStore'

interface EligibleCoupon {
  id: string
  code: string
  promotionName: string
  description?: string | null
  discountType: string
  discountValue: number
  minOrderSubtotal: number
  maxDiscountAmount?: number | null
  badgeText: string
  savingsAmount: number
  savingsFormatted?: string
  amountNeededToUnlock?: number
  unlockMessage?: string
}

interface ApplyCouponModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApplyCouponModal({ isOpen, onClose }: ApplyCouponModalProps) {
  const {
    items,
    appliedCouponCode,
    pricingEvaluation,
    applyCouponCode,
    removeCouponCode,
    isValidatingPromotion,
  } = useHydratedCart()

  const [manualCode, setManualCode] = useState('')
  const [applicableCoupons, setApplicableCoupons] = useState<EligibleCoupon[]>([])
  const [lockedCoupons, setLockedCoupons] = useState<EligibleCoupon[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const cartSubtotal = items.reduce((acc, itm) => acc + (itm.price || 0) * (itm.quantity || 1), 0)

  useEffect(() => {
    if (!isOpen) return

    async function fetchEligibleCoupons() {
      setIsLoading(true)
      setActionError(null)

      try {
        const payload = {
          subtotal: cartSubtotal,
          items: items.map((itm) => ({
            productId: itm.productId,
            variantId: itm.id,
            quantity: itm.quantity,
            unitPrice: itm.price,
            categoryId: itm.category,
          })),
        }

        const res = await fetch('/api/promotions/eligible-coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (data.success) {
          setApplicableCoupons(data.applicable || [])
          setLockedCoupons(data.locked || [])
        }
      } catch (err: any) {
        console.warn('Failed to load eligible coupons:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEligibleCoupons()
  }, [isOpen, cartSubtotal, items])

  if (!isOpen) return null

  const handleApply = async (codeToApply: string) => {
    setActionError(null)
    const result = await applyCouponCode(codeToApply.trim().toUpperCase())
    if (result.success) {
      onClose()
    } else {
      setActionError(result.error || 'This privilege could not be applied to your current selection.')
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleApply(manualCode)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-[#14293a] border border-[#d3d6db] rounded-sm max-w-lg w-full p-6 sm:p-7 space-y-5 relative shadow-2xl my-8 font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a909a] hover:text-[#14293a] p-1 rounded-xs hover:bg-[#f8f9fa] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-1.5 text-2xs uppercase tracking-widest text-[#b91c1c] font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Client Privileges</span>
          </div>
          <h3 className="text-2xl font-serif font-bold text-[#14293a] mt-1">
            Apply Coupon &amp; Offers
          </h3>
          <p className="text-xs text-[#6c7079] mt-0.5">
            Select an applicable private coupon or enter an invitation voucher code.
          </p>
        </div>

        {/* 1. Manual Code Entry Input */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ENTER INVITATION CODE"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              disabled={isValidatingPromotion}
              className="flex-1 px-3 py-2 text-xs font-mono tracking-wider uppercase bg-white border border-[#d3d6db] rounded-xs text-[#14293a] placeholder-[#8a909a] focus:outline-hidden focus:border-[#14293a]"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || isValidatingPromotion}
              className="px-5 py-2 bg-[#14293a] hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isValidatingPromotion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Apply</span>
            </button>
          </div>

          {actionError && (
            <p className="text-xs text-rose-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{actionError}</span>
            </p>
          )}
        </form>

        {/* Active Applied Coupon Banner */}
        {appliedCouponCode && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xs flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-mono font-bold text-emerald-900 tracking-wider">
                  {appliedCouponCode}
                </span>
                <span className="text-emerald-700 ml-2">is currently applied</span>
              </div>
            </div>
            <button
              onClick={removeCouponCode}
              className="text-xs font-mono font-bold text-[#b91c1c] hover:underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        )}

        {/* Coupon Lists Body */}
        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#14293a] mx-auto" />
            <p className="text-xs font-mono text-[#6c7079]">Evaluating active privileges...</p>
          </div>
        ) : (
          <div className="space-y-5 max-h-[360px] overflow-y-auto pr-1">
            {/* 2. Applicable Coupons Section */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#6c7079] block">
                Applicable Privileges ({applicableCoupons.length})
              </span>

              {applicableCoupons.length > 0 ? (
                <div className="space-y-2.5">
                  {applicableCoupons.map((coupon) => {
                    const isCurrent = appliedCouponCode === coupon.code
                    return (
                      <div
                        key={coupon.id}
                        className={`p-3.5 rounded-xs border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-emerald-50/50 border-emerald-400'
                            : 'bg-white border-[#d3d6db] hover:border-[#14293a]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs tracking-wider px-2 py-0.5 bg-[#f8f9fa] border border-[#d3d6db] rounded-xs text-[#14293a]">
                              {coupon.code}
                            </span>
                            <span className="text-2xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                              {coupon.savingsFormatted || `Save ₹${coupon.savingsAmount}`}
                            </span>
                          </div>
                          <h4 className="text-xs font-serif font-bold text-[#14293a]">
                            {coupon.promotionName}
                          </h4>
                          <p className="text-[11px] text-[#6c7079]">
                            {coupon.description || 'Applicable to current cart items.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApply(coupon.code)}
                          disabled={isCurrent || isValidatingPromotion}
                          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xs border transition-all cursor-pointer shrink-0 ${
                            isCurrent
                              ? 'bg-emerald-700 text-white border-emerald-700 cursor-default'
                              : 'bg-[#14293a] text-white hover:bg-neutral-800 border-[#14293a]'
                          }`}
                        >
                          {isCurrent ? 'APPLIED' : 'APPLY'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xs text-xs text-[#6c7079] text-center">
                  No coupons currently meet the minimum cart subtotal.
                </div>
              )}
            </div>

            {/* 3. Locked Coupons Section */}
            {lockedCoupons.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#f1f1f1]">
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#8a909a] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#8a909a]" />
                  <span>Locked Privileges ({lockedCoupons.length})</span>
                </span>

                <div className="space-y-2.5">
                  {lockedCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="p-3.5 rounded-xs border border-dashed border-[#d3d6db] bg-[#fafafa] flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-xs tracking-wider px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-xs text-[#6c7079]">
                            {coupon.code}
                          </span>
                          <span className="text-2xs font-mono text-[#8a909a]">
                            {coupon.badgeText}
                          </span>
                        </div>
                        <h4 className="text-xs font-serif font-semibold text-[#6c7079]">
                          {coupon.promotionName}
                        </h4>
                        <p className="text-[11px] text-[#b91c1c] font-medium font-mono">
                          {coupon.unlockMessage || `Add ₹${coupon.amountNeededToUnlock} more to unlock`}
                        </p>
                      </div>

                      <span className="text-2xs font-mono font-bold uppercase tracking-wider text-[#8a909a] bg-neutral-200/60 px-3 py-1.5 rounded-xs text-center">
                        Locked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#e5e7eb] flex items-center justify-between text-xs">
          <span className="text-[11px] font-mono text-[#6c7079]">
            Cart Subtotal: <strong>₹{cartSubtotal.toLocaleString('en-IN')}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#6c7079] hover:text-[#14293a] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
