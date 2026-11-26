'use client'

import React, { useState, useEffect } from 'react'
import { Tag, Check, X, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@repo/ui'
import { useHydratedCart } from '../../store/useCartStore'
import { ApplyCouponModal } from './ApplyCouponModal'

interface BestEligibleCoupon {
  id: string
  code: string
  promotionName: string
  savingsAmount: number
  savingsFormatted?: string
}

export function ConciergeCouponInput() {
  const {
    items,
    subtotal,
    deliveryMode,
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
  const [bestCoupon, setBestCoupon] = useState<BestEligibleCoupon | null>(null)

  useEffect(() => {
    if (appliedCouponCode || items.length === 0 || subtotal <= 0) {
      setBestCoupon(null)
      return
    }

    const controller = new AbortController()
    async function loadBestCoupon() {
      try {
        const res = await fetch('/api/promotions/eligible-coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            subtotal,
            deliveryMode,
            items: items.map((itm) => ({
              productId: itm.productId,
              variantId: itm.variantId || itm.id,
              quantity: itm.quantity,
              unitPrice: itm.price,
              categoryId: itm.category,
            })),
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.success && Array.isArray(data.applicable) && data.applicable.length > 0) {
          const sorted = [...data.applicable].sort(
            (a, b) => (Number(b.savingsAmount) || 0) - (Number(a.savingsAmount) || 0)
          )
          setBestCoupon(sorted[0] || null)
        } else {
          setBestCoupon(null)
        }
      } catch {
        // Ignore abort / network hiccup
      }
    }

    loadBestCoupon()
    return () => controller.abort()
  }, [appliedCouponCode, items, subtotal, deliveryMode])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCode.trim()) return
    const result = await applyCouponCode(inputCode.trim())
    if (result.success) {
      setInputCode('')
    }
  }

  const appliedGarmentPromo = appliedPromotions.find((p: any) => !p.isShippingWaiver)
  const appliedShippingWaiver = appliedPromotions.find((p: any) => p.isShippingWaiver)

  return (
    <div className="p-4 rounded-sm border border-[#d3d6db] bg-white space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-[#b91c1c]" strokeWidth={1.75} />
          Coupons &amp; Privileges
        </span>
        {appliedCouponCode ? (
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
            Applied
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-semibold text-[#b91c1c] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All Coupons</span>
            <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {appliedCouponCode ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-wider text-[#14293a]">
                  {appliedCouponCode}
                </span>
                <Check className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2} />
              </div>
              <p className="text-[11px] text-[#6c7079]">
                {appliedGarmentPromo?.name || appliedShippingWaiver?.name || 'Coupon discount applied'}
              </p>
            </div>

            <button
              type="button"
              onClick={removeCouponCode}
              className="text-[#6c7079] hover:text-[#b91c1c] transition-colors p-1 cursor-pointer"
              title="Remove coupon"
              aria-label="Remove coupon"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          {pricingEvaluation?.totalDiscount > 0 && (
            <p className="text-[11px] text-emerald-700 font-semibold">
              Coupon savings: ₹{Number(pricingEvaluation.totalDiscount).toLocaleString('en-IN')}
            </p>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-medium text-[#6c7079] hover:text-[#14293a] underline cursor-pointer block"
          >
            Change or view other available coupons
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Best Applicable Coupon Inline Callout */}
          {bestCoupon && (
            <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-sm flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-emerald-800 truncate">
                  {bestCoupon.savingsFormatted || `Save ₹${bestCoupon.savingsAmount.toLocaleString('en-IN')}`} with{' '}
                  <span className="font-mono uppercase">{bestCoupon.code}</span>
                </p>
                <p className="text-[11px] text-[#52565e] truncate">
                  {bestCoupon.promotionName}
                </p>
              </div>
              <button
                type="button"
                disabled={isValidatingPromotion}
                onClick={() => applyCouponCode(bestCoupon.code)}
                className="px-3 py-1.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                APPLY
              </button>
            </div>
          )}

          <form onSubmit={handleApply} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                disabled={isValidatingPromotion}
                className="flex-1 px-3 py-1.5 text-xs font-mono tracking-wider uppercase border border-[#d3d6db] rounded-sm focus:outline-none focus:border-[#14293a]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputCode.trim() || isValidatingPromotion}
                className="text-xs font-mono bg-[#14293a] text-white hover:bg-[#b91c1c] px-4 rounded-sm"
              >
                {isValidatingPromotion ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>

            {promotionError && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#b91c1c] font-sans pt-0.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>{promotionError}</span>
              </div>
            )}
          </form>
        </div>
      )}

      <ApplyCouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
