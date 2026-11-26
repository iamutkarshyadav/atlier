'use client'

import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, Tag, Zap } from 'lucide-react'
import type { Category, Product, ProductVariant } from '@repo/supabase/utils'
import { sortSizes } from '@repo/supabase/utils'

export interface PriceBucket {
  id: string
  label: string
  min: number | null
  max: number | null
}

export const PRICE_BUCKETS: readonly PriceBucket[] = [
  { id: 'under-2000', label: 'Under ₹2,000', min: null, max: 2000 },
  { id: '2000-5000', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { id: '5000-10000', label: '₹5,000 – ₹10,000', min: 5000, max: 10000 },
  { id: 'above-10000', label: 'Above ₹10,000', min: 10000, max: null },
]

export const DISCOUNT_THRESHOLDS = [10, 20, 30, 50] as const

const COLOR_HEX_MAP: Record<string, string> = {
  'vintage black': '#1C1C1C',
  black: '#161616',
  carbon: '#232326',
  obsidian: '#111827',
  charcoal: '#374151',
  slate: '#475569',
  grey: '#71717A',
  gray: '#71717A',
  'heather grey': '#9CA3AF',
  'washed ink': '#2A303C',
  ink: '#1E293B',
  'raw indigo': '#1B2A4A',
  indigo: '#243B6B',
  navy: '#172554',
  midnight: '#14293A',
  blue: '#2563EB',
  sky: '#7DD3FC',
  'natural ecru': '#F0EAE1',
  ecru: '#EFECE6',
  ivory: '#F5F2EB',
  'off white': '#F8F7F4',
  white: '#FFFFFF',
  cream: '#F3EFE0',
  sand: '#D6C7B2',
  beige: '#D8C8B4',
  khaki: '#BDB096',
  camel: '#B88B58',
  taupe: '#8B7D70',
  tan: '#C19A6B',
  brown: '#5C4033',
  espresso: '#3B2820',
  chocolate: '#4A2C2A',
  olive: '#556B2F',
  sage: '#7A8B7B',
  moss: '#4A5D4E',
  forest: '#1E3F20',
  emerald: '#047857',
  burgundy: '#6B1D2F',
  maroon: '#58181F',
  crimson: '#B91C1C',
  red: '#B91C1C',
  rust: '#9A3412',
  terracotta: '#B45309',
}

export function resolveColorHex(colorName: string): string {
  const normalized = colorName.trim().toLowerCase()
  if (COLOR_HEX_MAP[normalized]) return COLOR_HEX_MAP[normalized]

  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (normalized.includes(key)) return hex
  }
  return '#9CA3AF'
}

export interface ColorFacet {
  name: string
  hex: string
  count: number
}

export interface SizeFacet {
  size: string
  inStock: boolean
}

export function extractVariantSizeFacets(
  products: Product[],
  variantsMap: Record<string, ProductVariant[]>
): SizeFacet[] {
  const sizeStockMap = new Map<string, boolean>()

  for (const product of products) {
    const variants = variantsMap[product.id] || []
    for (const variant of variants) {
      const size = variant.size?.trim()
      if (!size) continue
      const currentInStock = sizeStockMap.get(size) ?? false
      sizeStockMap.set(size, currentInStock || variant.stock > 0)
    }
  }

  const ordered = sortSizes(Array.from(sizeStockMap.keys()))
  return ordered.map((size) => ({
    size,
    inStock: sizeStockMap.get(size) ?? false,
  }))
}

export function extractVariantColorFacets(
  products: Product[],
  variantsMap: Record<string, ProductVariant[]>
): ColorFacet[] {
  const colorMap = new Map<string, { name: string; hex: string; productIds: Set<string> }>()

  for (const product of products) {
    const variants = variantsMap[product.id] || []
    for (const variant of variants) {
      const rawColor = variant.color?.trim()
      if (!rawColor) continue
      const key = rawColor.toLowerCase()
      const existing = colorMap.get(key)
      if (existing) {
        existing.productIds.add(product.id)
      } else {
        colorMap.set(key, {
          name: rawColor,
          hex: resolveColorHex(rawColor),
          productIds: new Set([product.id]),
        })
      }
    }
  }

  return Array.from(colorMap.values())
    .map((entry) => ({
      name: entry.name,
      hex: entry.hex,
      count: entry.productIds.size,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function formatPriceRangeLabel(minPrice: number | null, maxPrice: number | null): string | null {
  if (minPrice === null && maxPrice === null) return null
  const matchingBucket = PRICE_BUCKETS.find(
    (bucket) => bucket.min === minPrice && bucket.max === maxPrice
  )
  if (matchingBucket) return matchingBucket.label
  if (minPrice !== null && maxPrice !== null) {
    return `₹${minPrice.toLocaleString('en-IN')} – ₹${maxPrice.toLocaleString('en-IN')}`
  }
  if (minPrice !== null) {
    return `Above ₹${minPrice.toLocaleString('en-IN')}`
  }
  return `Under ₹${maxPrice!.toLocaleString('en-IN')}`
}

export interface ShopFilterPanelProps {
  categories: Category[]
  categoryProductCounts: Record<string, number>
  totalProductCount: number
  selectedCategory: string
  onSelectCategory: (category: string) => void

  availableSizes: SizeFacet[]
  selectedSize: string | null
  onSelectSize: (size: string | null) => void

  availableColors: ColorFacet[]
  selectedColor: string | null
  onSelectColor: (color: string | null) => void

  minPrice: number | null
  maxPrice: number | null
  onPriceRangeChange: (min: number | null, max: number | null) => void

  tryOnOnly: boolean
  onToggleTryOn: () => void
  boltEligibleCount?: number
  hideBoltToggle?: boolean

  onSaleOnly: boolean
  onToggleOnSale: () => void
  onSaleCount: number

  minDiscount: number | null
  onSelectMinDiscount: (discount: number | null) => void

  activeFilterCount: number
  onClearAll: () => void
  variant?: 'desktop' | 'mobile'
}

export default function ShopFilterPanel({
  categories,
  categoryProductCounts,
  totalProductCount,
  selectedCategory,
  onSelectCategory,
  availableSizes,
  selectedSize,
  onSelectSize,
  availableColors,
  selectedColor,
  onSelectColor,
  minPrice,
  maxPrice,
  onPriceRangeChange,
  tryOnOnly,
  onToggleTryOn,
  boltEligibleCount = 0,
  hideBoltToggle = false,
  onSaleOnly,
  onToggleOnSale,
  onSaleCount,
  minDiscount,
  onSelectMinDiscount,
  activeFilterCount,
  onClearAll,
  variant = 'desktop',
}: ShopFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    size: true,
    color: true,
    price: true,
    deals: true,
  })

  const [draftMinPrice, setDraftMinPrice] = useState<string>(minPrice !== null ? String(minPrice) : '')
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>(maxPrice !== null ? String(maxPrice) : '')

  useEffect(() => {
    setDraftMinPrice(minPrice !== null ? String(minPrice) : '')
  }, [minPrice])

  useEffect(() => {
    setDraftMaxPrice(maxPrice !== null ? String(maxPrice) : '')
  }, [maxPrice])

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const rootCategories = categories.filter((c) => !c.parent_id)
  const getSubCategories = (parentId: string) =>
    categories.filter((c) => {
      if (c.parent_id !== parentId) return false
      const count = categoryProductCounts[c.name] || 0
      // Hide zero-count subcategories unless currently active in the URL/filter state
      return count > 0 || selectedCategory === c.name
    })

  const activeBucketId =
    PRICE_BUCKETS.find((b) => b.min === minPrice && b.max === maxPrice)?.id ?? null

  const applyCustomRange = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const parsedMin = draftMinPrice.trim() ? Math.max(0, Number(draftMinPrice)) : null
    const parsedMax = draftMaxPrice.trim() ? Math.max(0, Number(draftMaxPrice)) : null

    const safeMin = parsedMin !== null && !Number.isNaN(parsedMin) ? parsedMin : null
    const safeMax = parsedMax !== null && !Number.isNaN(parsedMax) ? parsedMax : null

    if (safeMin !== null && safeMax !== null && safeMin > safeMax) {
      onPriceRangeChange(safeMax, safeMin)
      return
    }
    onPriceRangeChange(safeMin, safeMax)
  }

  return (
    <div className="space-y-4">
      {/* Header Bar (Desktop) */}
      {variant === 'desktop' && (
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb]">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14293a]">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 text-[#b91c1c]">({activeFilterCount})</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#b91c1c] hover:text-[#14293a] transition-colors"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Bolt 45-Min Try-On Toggle */}
      {!hideBoltToggle && (
        <div className="border border-[#e5e7eb] rounded-sm p-3 bg-[#f8f8f8]">
          <button
            type="button"
            role="switch"
            aria-checked={tryOnOnly}
            onClick={onToggleTryOn}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Zap
                  className={`w-3.5 h-3.5 shrink-0 ${tryOnOnly ? 'text-[#b91c1c]' : 'text-[#14293a]'}`}
                  strokeWidth={1.75}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                  Bolt 45-Min Try-On
                </span>
              </div>
              <p className="text-[11px] text-[#6c7079] mt-0.5 leading-snug">
                Try at home before paying ({boltEligibleCount})
              </p>
            </div>
            <span
              aria-hidden="true"
              className={`w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors flex items-center ${
                tryOnOnly ? 'bg-[#b91c1c] justify-end' : 'bg-[#d3d6db] justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </span>
          </button>
        </div>
      )}

      {/* On Sale & Discount Thresholds */}
      <div className="border-b border-[#e5e7eb] pb-4">
        <button
          type="button"
          onClick={() => toggleSection('deals')}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] py-1"
        >
          <span>Offers & Savings</span>
          {expandedSections.deals ? (
            <ChevronUp className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
          )}
        </button>

        {expandedSections.deals && (
          <div className="mt-2.5 space-y-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={onSaleOnly}
              onClick={onToggleOnSale}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-sm border text-xs transition-colors ${
                onSaleOnly
                  ? 'border-[#b91c1c] bg-red-50/60 text-[#b91c1c] font-semibold'
                  : 'border-[#e5e7eb] bg-white text-[#14293a] hover:border-[#14293a]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" strokeWidth={1.75} />
                On Sale Now
              </span>
              <span className="text-[11px] font-mono text-[#6c7079]">({onSaleCount})</span>
            </button>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6c7079] mb-1.5">
                Minimum Discount
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {DISCOUNT_THRESHOLDS.map((pct) => {
                  const active = minDiscount === pct
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onSelectMinDiscount(active ? null : pct)}
                      className={`py-1.5 text-[11px] font-mono rounded-sm border text-center transition-colors ${
                        active
                          ? 'bg-[#14293a] text-white border-[#14293a]'
                          : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a]'
                      }`}
                    >
                      {pct}%+
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Hierarchy */}
      <div className="border-b border-[#e5e7eb] pb-4">
        <button
          type="button"
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] py-1"
        >
          <span>Category</span>
          {expandedSections.category ? (
            <ChevronUp className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
          )}
        </button>

        {expandedSections.category && (
          <div className="mt-2.5 space-y-1">
            <button
              type="button"
              onClick={() => onSelectCategory('All')}
              className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-sm text-xs transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-[#14293a] text-white font-semibold'
                  : 'text-[#14293a] hover:bg-[#f5f5f4]'
              }`}
            >
              <span>All Collections</span>
              <span
                className={`text-[10px] font-mono ${
                  selectedCategory === 'All' ? 'text-white/80' : 'text-[#6c7079]'
                }`}
              >
                {totalProductCount}
              </span>
            </button>

            {rootCategories.map((root) => {
              const subs = getSubCategories(root.id)
              const rootCount = categoryProductCounts[root.name] || 0
              const subSum = subs.reduce(
                (acc, s) => acc + (categoryProductCounts[s.name] || 0),
                0
              )
              const displayCount = Math.max(rootCount, subSum)
              const isRootSelected = selectedCategory === root.name

              if (displayCount === 0 && !isRootSelected && subs.length === 0) {
                return null
              }

              return (
                <div key={root.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(root.name)}
                    className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-sm text-xs transition-colors ${
                      isRootSelected
                        ? 'bg-[#14293a] text-white font-semibold'
                        : 'text-[#14293a] font-medium hover:bg-[#f5f5f4]'
                    }`}
                  >
                    <span className="truncate pr-2">{root.name}</span>
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        isRootSelected ? 'text-white/80' : 'text-[#6c7079]'
                      }`}
                    >
                      {displayCount}
                    </span>
                  </button>

                  {subs.length > 0 && (
                    <div className="pl-3 space-y-0.5 border-l border-[#e5e7eb] ml-2.5">
                      {subs.map((sub) => {
                        const subCount = categoryProductCounts[sub.name] || 0
                        const isSubSelected = selectedCategory === sub.name
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => onSelectCategory(sub.name)}
                            className={`w-full flex items-center justify-between text-left px-2 py-1 rounded-sm text-[11px] transition-colors ${
                              isSubSelected
                                ? 'bg-[#14293a] text-white font-semibold'
                                : 'text-[#52565e] hover:text-[#14293a] hover:bg-[#f5f5f4]'
                            }`}
                          >
                            <span className="truncate pr-2">{sub.name}</span>
                            <span
                              className={`text-[10px] font-mono shrink-0 ${
                                isSubSelected ? 'text-white/80' : 'text-[#6c7079]'
                              }`}
                            >
                              {subCount}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dynamic Variant Size Facet */}
      {availableSizes.length > 0 && (
        <div className="border-b border-[#e5e7eb] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('size')}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] py-1"
          >
            <span>Size</span>
            {expandedSections.size ? (
              <ChevronUp className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
            )}
          </button>

          {expandedSections.size && (
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {availableSizes.map(({ size, inStock }) => {
                const isSelected = selectedSize?.toLowerCase() === size.toLowerCase()
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!inStock && !isSelected}
                    onClick={() => onSelectSize(isSelected ? null : size)}
                    className={`py-1.5 px-1 text-[11px] font-mono rounded-sm border text-center transition-colors ${
                      isSelected
                        ? 'bg-[#14293a] text-white border-[#14293a] font-semibold'
                        : inStock
                          ? 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a]'
                          : 'bg-[#f5f5f4] text-[#9ca3af] border-[#e5e7eb] line-through cursor-not-allowed'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Variant Color Swatches */}
      {availableColors.length > 0 && (
        <div className="border-b border-[#e5e7eb] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('color')}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] py-1"
          >
            <span>Color</span>
            {expandedSections.color ? (
              <ChevronUp className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
            )}
          </button>

          {expandedSections.color && (
            <div className="mt-2.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {availableColors.map((color) => {
                const isSelected = selectedColor?.toLowerCase() === color.name.toLowerCase()
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => onSelectColor(isSelected ? null : color.name)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#14293a]/5 text-[#14293a] font-semibold'
                        : 'text-[#52565e] hover:bg-[#f5f5f4] hover:text-[#14293a]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-3.5 h-3.5 rounded-full shrink-0 border border-neutral-300 ${
                          isSelected ? 'ring-2 ring-offset-2 ring-[#14293a]' : ''
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="truncate">{color.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#6c7079] shrink-0">
                      {color.count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Price Range: Quick Buckets + Min/Max Input */}
      <div className="pb-2">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#14293a] py-1"
        >
          <span>Price Range</span>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
          )}
        </button>

        {expandedSections.price && (
          <div className="mt-2.5 space-y-3">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onPriceRangeChange(null, null)}
                className={`w-full text-left px-2.5 py-1.5 rounded-sm text-xs transition-colors ${
                  minPrice === null && maxPrice === null
                    ? 'bg-[#14293a] text-white font-semibold'
                    : 'text-[#52565e] hover:bg-[#f5f5f4] hover:text-[#14293a]'
                }`}
              >
                All Prices
              </button>
              {PRICE_BUCKETS.map((bucket) => {
                const isSelected = activeBucketId === bucket.id
                return (
                  <button
                    key={bucket.id}
                    type="button"
                    onClick={() =>
                      isSelected
                        ? onPriceRangeChange(null, null)
                        : onPriceRangeChange(bucket.min, bucket.max)
                    }
                    className={`w-full text-left px-2.5 py-1.5 rounded-sm text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#14293a] text-white font-semibold'
                        : 'text-[#52565e] hover:bg-[#f5f5f4] hover:text-[#14293a]'
                    }`}
                  >
                    {bucket.label}
                  </button>
                )
              })}
            </div>

            <form onSubmit={applyCustomRange} className="pt-2 border-t border-[#e5e7eb]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6c7079] mb-1.5">
                Custom Range (₹)
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Min"
                  aria-label="Minimum price in INR"
                  value={draftMinPrice}
                  onChange={(e) => setDraftMinPrice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-[#d3d6db] rounded-sm text-[#14293a] focus:outline-none focus:border-[#14293a]"
                />
                <span className="text-xs text-[#6c7079]">–</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Max"
                  aria-label="Maximum price in INR"
                  value={draftMaxPrice}
                  onChange={(e) => setDraftMaxPrice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-[#d3d6db] rounded-sm text-[#14293a] focus:outline-none focus:border-[#14293a]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#14293a] text-white rounded-sm hover:bg-[#b91c1c] transition-colors shrink-0"
                >
                  Go
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
