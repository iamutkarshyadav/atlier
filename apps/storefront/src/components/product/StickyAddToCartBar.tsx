'use client'

import React, { useEffect, useState } from 'react'
import { ShoppingBag, Zap } from 'lucide-react'
import { ProductImage } from '@/components/ui/ProductImage'
import { BOLT_HOLD_FEE } from '@repo/supabase/pricing'

interface StickyAddToCartBarProps {
  targetRef: React.RefObject<HTMLDivElement | null>
  title: string
  imageUrl: string
  activePrice: number
  mrp: number
  selectedColor?: string | null
  selectedSize?: string | null
  isOutOfStock: boolean
  isTryOnEligible?: boolean
  isAdding: boolean
  onAddToCart: (isBoltTryOn: boolean) => void
  onSelectSizePrompt: () => void
}

export function StickyAddToCartBar({
  targetRef,
  title,
  imageUrl,
  activePrice,
  mrp,
  selectedColor,
  selectedSize,
  isOutOfStock,
  isTryOnEligible = true,
  isAdding,
  onAddToCart,
  onSelectSizePrompt,
}: StickyAddToCartBarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const target = targetRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        // Show only after the main CTA block has scrolled above the viewport
        setIsVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [targetRef])

  if (!isVisible) return null

  const handlePrimaryClick = () => {
    if (!selectedSize && !isOutOfStock) {
      onSelectSizePrompt()
      return
    }
    onAddToCart(false)
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-[#d3d6db] px-4 py-2.5 sm:py-3 transition-transform duration-200"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      role="region"
      aria-label="Quick purchase bar"
    >
      <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Compact garment identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-12 bg-[#f5f5f4] border border-[#e5e7eb] rounded-sm overflow-hidden shrink-0 hidden sm:block">
            <ProductImage src={imageUrl} alt={title} fill sizes="40px" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#14293a] truncate">{title}</p>
            <div className="flex items-center gap-2 text-[11px] text-[#6c7079]">
              <span className="font-bold text-[#14293a] tabular-nums">
                ₹{Math.round(activePrice).toLocaleString('en-IN')}
              </span>
              {mrp > activePrice && (
                <span className="line-through text-[#8a909a] tabular-nums hidden xs:inline">
                  ₹{Math.round(mrp).toLocaleString('en-IN')}
                </span>
              )}
              {(selectedColor || selectedSize) && (
                <span className="truncate">
                  · {[selectedColor, selectedSize ? `Size ${selectedSize}` : null].filter(Boolean).join(' / ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isTryOnEligible && !isOutOfStock && (
            <button
              type="button"
              onClick={() => (selectedSize ? onAddToCart(true) : onSelectSizePrompt())}
              className="hidden md:inline-flex items-center gap-1.5 h-10 px-4 border border-[#14293a] bg-white hover:bg-[#f8f8f8] text-[#14293a] text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#b91c1c] fill-[#b91c1c]" strokeWidth={1.75} />
              <span>Bolt Try-On (₹{BOLT_HOLD_FEE})</span>
            </button>
          )}
          <button
            type="button"
            disabled={isOutOfStock || isAdding}
            onClick={handlePrimaryClick}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 sm:px-6 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer disabled:opacity-40"
          >
            <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>
              {isOutOfStock
                ? 'Sold Out'
                : selectedSize
                  ? 'Add to Bag'
                  : 'Select Size'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
