'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Tag,
  Copy,
  Check,
  Percent,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import type { Product } from '@repo/supabase/utils'
import type { ProductPricingSummary } from '@repo/supabase/pricing'
import { ProductCard } from '@/components/ProductCard'

interface PublicCoupon {
  code: string
  promotionName: string
  description?: string | null
  discountType: string
  discountValue: number
  minOrderSubtotal?: number | null
  maxDiscountAmount?: number | null
  endsAt?: string | null
  badgeText: string
}

interface OffersInteractiveZoneProps {
  products: Product[]
  pricingList: ProductPricingSummary[]
  coupons: PublicCoupon[]
  featuredOffer?: any
  initialDiscountFilter?: number
}

export function OffersInteractiveZone({
  products,
  pricingList,
  coupons,
  featuredOffer,
  initialDiscountFilter = 0,
}: OffersInteractiveZoneProps) {
  const [selectedDiscountTier, setSelectedDiscountTier] = useState<number>(initialDiscountFilter)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const pricingMap = useMemo(() => {
    const map = new Map<string, ProductPricingSummary>()
    pricingList.forEach((p) => map.set(p.productId, p))
    return map
  }, [pricingList])

  const handleCopy = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  // Filter products based on selected discount tier
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const pricing = pricingMap.get(p.id)
      const discountPct = pricing?.discountPercentage || 0
      if (selectedDiscountTier === 0) return true
      return discountPct >= selectedDiscountTier
    })
  }, [products, pricingMap, selectedDiscountTier])

  const tierTabs = [
    { label: 'All Items', value: 0 },
    { label: '15% Off+', value: 15 },
    { label: '30% Off+', value: 30 },
    { label: '50% Off+', value: 50 },
  ]

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Live Coupons Strip */}
      {coupons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2.5">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#14293a]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                Available Coupons
              </h2>
            </div>
            <span className="text-xs text-[#8a909a]">
              Apply at checkout
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((c, idx) => {
              const isCopied = copiedCode === c.code
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#e5e7eb] rounded-xs p-4 shadow-2xs hover:border-[#14293a] transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-mono uppercase font-bold text-[#b91c1c] bg-red-50 px-2 py-0.5 border border-red-100 rounded-xs">
                        {c.badgeText}
                      </span>
                      {c.minOrderSubtotal ? (
                        <span className="text-[11px] text-[#6c7079]">
                          On orders above ₹{c.minOrderSubtotal.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#065f46] font-medium">
                          No Minimum Order
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#14293a]">
                      {c.promotionName}
                    </h3>
                    {c.description && (
                      <p className="text-xs text-[#6c7079] line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#f1f1f1] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(c.code)}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-bold tracking-wider rounded-xs border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-[#14293a] text-white hover:bg-neutral-800 border-[#14293a]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{c.code}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. Filter Bar & Product Catalog */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3">
          <span className="text-xs text-[#6c7079]">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tierTabs.map((tab) => {
              const isSelected = selectedDiscountTier === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSelectedDiscountTier(tab.value)}
                  className={`py-1 px-3 text-xs font-medium rounded-xs transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[#14293a] text-white border-[#14293a]'
                      : 'bg-white text-[#6c7079] border-[#d3d6db] hover:border-[#14293a] hover:text-[#14293a]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Filtered Product Catalog Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((p) => {
              const pricing = pricingMap.get(p.id)
              const hasPriceDrop = pricing?.mrp && pricing.sellingPrice && pricing.mrp > pricing.sellingPrice
              return (
                <ProductCard
                  key={p.id}
                  product={{
                    ...p,
                    price: pricing?.sellingPrice ?? p.price,
                    ...(hasPriceDrop ? { compare_at_price: pricing!.mrp } : {}),
                  } as any}
                  mrp={pricing?.mrp}
                  sellingPrice={pricing?.sellingPrice}
                  discountPercentage={pricing?.discountPercentage}
                  showTryOnBadge={true}
                />
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-[#f8f9fa] border border-[#d3d6db] rounded-xs space-y-3">
            <Percent className="w-8 h-8 text-[#8a909a] mx-auto" />
            <h3 className="text-sm font-mono uppercase font-bold text-[#14293a]">
              No Pieces In This Discount Tier
            </h3>
            <p className="text-xs text-[#6c7079] max-w-sm mx-auto">
              We update our archive sale and privilege tiers weekly. Select another discount tier or view all collections.
            </p>
            <button
              onClick={() => setSelectedDiscountTier(0)}
              className="mt-2 px-4 py-2 bg-[#14293a] text-white text-xs font-mono uppercase font-bold tracking-wider rounded-xs"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
