'use client'

import React from 'react'
import { Check, Truck, Zap } from 'lucide-react'
import {
  BOLT_MAX_TRY_ON_ITEMS,
  FREE_SHIPPING_THRESHOLD,
} from '@/store/cartSubtotal'
import type { DeliveryMode } from '@/store/useCartStore'

interface CartProgressBarsProps {
  subtotal: number
  itemCount: number
  deliveryMode: DeliveryMode
  isBoltServiceable?: boolean
  compact?: boolean
}

export function CartProgressBars({
  subtotal,
  itemCount,
  deliveryMode,
  isBoltServiceable = false,
  compact = false,
}: CartProgressBarsProps) {
  const amountRemainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgressPct = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  )
  const isFreeShippingUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD

  const showBoltBar = deliveryMode === 'try_on' || isBoltServiceable
  const boltProgressPct = Math.min(
    100,
    Math.round((itemCount / BOLT_MAX_TRY_ON_ITEMS) * 100)
  )
  const isOverBoltLimit = deliveryMode === 'try_on' && itemCount > BOLT_MAX_TRY_ON_ITEMS

  return (
    <div
      className={`border border-[#e5e7eb] bg-[#f8f8f8] rounded-sm ${
        compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'
      } font-sans text-[#14293a]`}
    >
      {/* 1. Free Express Shipping Progress Bar (Pre-coupon subtotal threshold) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium">
            {isFreeShippingUnlocked ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" strokeWidth={2} />
                <span className="text-emerald-800 font-semibold">
                  Free Express Delivery unlocked
                </span>
              </>
            ) : (
              <>
                <Truck className="w-3.5 h-3.5 text-[#14293a] shrink-0" strokeWidth={1.75} />
                <span>
                  Add{' '}
                  <strong className="font-bold">
                    ₹{Math.ceil(amountRemainingForFreeShipping).toLocaleString('en-IN')}
                  </strong>{' '}
                  more for <strong className="text-[#14293a]">FREE Express Shipping</strong>
                </span>
              </>
            )}
          </span>
          <span className="text-[11px] font-mono text-[#6c7079] shrink-0">
            ₹{Math.min(subtotal, FREE_SHIPPING_THRESHOLD).toLocaleString('en-IN')} / ₹
            {FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="w-full h-1.5 bg-[#e5e7eb] overflow-hidden rounded-none">
          <div
            className={`h-full transition-all duration-300 ${
              isFreeShippingUnlocked ? 'bg-emerald-700' : 'bg-[#14293a]'
            }`}
            style={{ width: `${shippingProgressPct}%` }}
          />
        </div>
      </div>

      {/* 2. Bolt Try-On Bag Capacity Progress Bar (X / 5 pieces selected) */}
      {showBoltBar && (
        <div className="space-y-1.5 pt-2 border-t border-[#e5e7eb]">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Zap
                className={`w-3.5 h-3.5 shrink-0 ${
                  isOverBoltLimit ? 'text-[#b91c1c]' : 'text-[#b91c1c] fill-[#b91c1c]'
                }`}
                strokeWidth={1.75}
              />
              <span className={isOverBoltLimit ? 'text-[#b91c1c] font-semibold' : ''}>
                Bolt Try-On Bag:{' '}
                <strong className="font-bold">
                  {itemCount} / {BOLT_MAX_TRY_ON_ITEMS} pieces selected
                </strong>
              </span>
            </span>
            <span className="text-[11px] text-[#6c7079] shrink-0">
              {isOverBoltLimit
                ? `Remove ${itemCount - BOLT_MAX_TRY_ON_ITEMS}`
                : `${Math.max(0, BOLT_MAX_TRY_ON_ITEMS - itemCount)} left`}
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#e5e7eb] overflow-hidden rounded-none">
            <div
              className={`h-full transition-all duration-300 ${
                isOverBoltLimit ? 'bg-[#b91c1c]' : 'bg-[#14293a]'
              }`}
              style={{ width: `${boltProgressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
