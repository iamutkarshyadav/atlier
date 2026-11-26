'use client'

import React from 'react'
import { Check, ShieldCheck, Zap } from 'lucide-react'
import type { CartItem } from '@/store/useCartStore'
import { BOLT_HOLD_FEE, STANDARD_SHIPPING_FEE } from '@/store/cartSubtotal'

export interface PriceDetailsBoxProps {
  items: CartItem[]
  subtotal: number
  discount: number
  discountedSubtotal: number
  tax: number
  shippingFee: number
  estimatedTotal: number
  isBoltSelected: boolean
  appliedCouponCode?: string | null
  qualifiesForFreeShipping: boolean
  standardShippingFee?: number
  boltHoldFee?: number
  compact?: boolean
}

export function PriceDetailsBox({
  items,
  subtotal,
  discount,
  discountedSubtotal,
  tax,
  shippingFee,
  estimatedTotal,
  isBoltSelected,
  appliedCouponCode,
  qualifiesForFreeShipping,
  standardShippingFee = STANDARD_SHIPPING_FEE,
  boltHoldFee = BOLT_HOLD_FEE,
  compact = false,
}: PriceDetailsBoxProps) {
  const catalogSavings = items.reduce((acc, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return acc + (item.originalPrice - item.price) * item.quantity
    }
    return acc
  }, 0)

  const totalMrp = subtotal + catalogSavings
  const shippingSavings = !isBoltSelected && qualifiesForFreeShipping && subtotal > 0 ? standardShippingFee : 0
  const totalSavings = catalogSavings + discount + shippingSavings

  const immediateDue = isBoltSelected ? shippingFee : estimatedTotal

  return (
    <div
      className={`border border-[#d3d6db] bg-[#f8f8f8] rounded-sm font-sans text-[#14293a] ${
        compact ? 'p-4 space-y-3' : 'p-5 sm:p-6 space-y-4'
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14293a]">
          Price Details ({items.reduce((acc, it) => acc + it.quantity, 0)}{' '}
          {items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'Item' : 'Items'})
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-[#52565e]">
          <span>Total MRP</span>
          <span className="font-medium text-[#14293a] tabular-nums">
            ₹{Math.round(totalMrp).toLocaleString('en-IN')}
          </span>
        </div>

        {catalogSavings > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span>Discount on MRP</span>
            <span className="font-semibold tabular-nums">
              -₹{Math.round(catalogSavings).toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <span className="flex items-center gap-1.5">
              <span>Coupon Discount</span>
              {appliedCouponCode && (
                <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.2 bg-emerald-50 border border-emerald-200 rounded-sm">
                  {appliedCouponCode}
                </span>
              )}
            </span>
            <span className="font-semibold tabular-nums">
              -₹{Math.round(discount).toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {isBoltSelected ? (
          <>
            <div className="flex items-center justify-between text-[#52565e]">
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#b91c1c]" strokeWidth={1.75} />
                <span>Bolt Convenience Hold</span>
              </span>
              <span className="font-semibold text-[#14293a] tabular-nums">
                {shippingFee === 0 ? (
                  <>
                    <span className="line-through text-[#8a909a] mr-1.5 font-normal">
                      ₹{boltHoldFee}
                    </span>
                    <span className="text-emerald-700">FREE</span>
                  </>
                ) : (
                  `₹${Math.round(shippingFee).toLocaleString('en-IN')}`
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#52565e] pt-1">
              <span>Payable after Try-On (Kept items)</span>
              <span className="font-semibold text-[#14293a] tabular-nums">
                ₹{Math.round(discountedSubtotal).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="border-t border-[#d3d6db] pt-3 flex items-center justify-between text-sm font-bold text-[#14293a]">
              <span>Immediate Hold Due</span>
              <span className="text-base tabular-nums text-[#b91c1c]">
                ₹{Math.round(immediateDue).toLocaleString('en-IN')}
              </span>
            </div>

            {!compact && (
              <p className="text-[11px] text-[#6c7079] leading-relaxed flex items-start gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#14293a] shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>
                  The ₹{boltHoldFee} hold is credited in full toward kept garments at final settlement.
                </span>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-[#52565e]">
              <span>Delivery Fee</span>
              <span className="font-semibold tabular-nums">
                {shippingFee === 0 ? (
                  <>
                    <span className="line-through text-[#8a909a] mr-1.5 font-normal">
                      ₹{standardShippingFee}
                    </span>
                    <span className="text-emerald-700 font-bold">FREE</span>
                  </>
                ) : (
                  <span className="text-[#14293a]">
                    ₹{Math.round(shippingFee).toLocaleString('en-IN')}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#52565e]">
              <span>GST (12%)</span>
              <span className="font-medium text-[#14293a] tabular-nums">
                ₹{Math.round(tax).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="border-t border-[#d3d6db] pt-3 flex items-center justify-between text-sm font-bold text-[#14293a]">
              <span>Total Payable</span>
              <span className="text-base tabular-nums">
                ₹{Math.round(immediateDue).toLocaleString('en-IN')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Crisp Emerald Savings Strip */}
      {totalSavings > 0 && (
        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center gap-2 text-xs text-emerald-800 font-semibold">
          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" strokeWidth={2} />
          <span>
            You are saving ₹{Math.round(totalSavings).toLocaleString('en-IN')} on this order
          </span>
        </div>
      )}
    </div>
  )
}
