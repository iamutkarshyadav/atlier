'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Zap, Heart, Check, Star } from 'lucide-react'
import {
  sortSizes,
  sortVariantsBySize,
  type Product,
  type ProductVariant,
} from '@repo/supabase/utils'
import type { ProductPricingSummary } from '@repo/supabase/pricing'
import { useCartStore } from '../store/useCartStore'
import { useHydratedWishlist } from '../store/useWishlistStore'
import { useHydratedBolt } from '../store/useBoltStore'
import { ProductImage } from './ui/ProductImage'

export const SECONDARY_IMAGES: Record<string, string> = {
  'b1000000-0000-0000-0000-000000000001':
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000002':
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000003':
    'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000004':
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000005':
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000006':
    'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1200&q=85',
}

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#1c1c1c',
  'vintage black': '#1c1c1c',
  'pitch black': '#141414',
  'raw black': '#191919',
  'faded onyx': '#2b2b2b',
  'washed ink': '#2a303c',
  'raw indigo': '#1b2a4a',
  navy: '#1e293b',
  charcoal: '#374151',
  slate: '#475569',
  grey: '#6b7280',
  gray: '#6b7280',
  white: '#fafaf9',
  'chalk white': '#f5f5f4',
  ivory: '#f7f4ed',
  ecru: '#f0eae1',
  'natural ecru': '#f0eae1',
  cream: '#efe9dc',
  beige: '#dcd6cd',
  sand: '#d6cbb8',
  olive: '#3f443e',
  sage: '#6b7d6a',
  emerald: '#047857',
  crimson: '#b91c1c',
  burgundy: '#7f1d1d',
  maroon: '#6b1d2f',
  brown: '#5c4033',
  camel: '#b08968',
  tan: '#c8a986',
}

function resolveColorHex(colorName: string): string {
  const key = colorName.trim().toLowerCase()
  if (COLOR_HEX_MAP[key]) return COLOR_HEX_MAP[key]!
  for (const [token, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (key.includes(token)) return hex
  }
  return '#374151'
}

export interface ProductColorway {
  name: string
  hex: string
  imageUrl?: string | null
}

export interface ProductCardProps {
  product: Product & {
    compare_at_price?: number | null
    is_try_on_eligible?: boolean
    extra_offer_tag?: string | null
    average_rating?: number | null
    review_count?: number | null
  }
  variants?: ProductVariant[]
  colorways?: ProductColorway[]
  secondaryImage?: string
  priority?: boolean
  className?: string
  showTryOnBadge?: boolean
  badgeLabel?: string
  signalTag?: 'NEW' | 'BESTSELLER' | 'LOW STOCK' | null
  rating?: number
  reviewCount?: number
  mrp?: number
  sellingPrice?: number
  discountPercentage?: number
  extraOfferTag?: string
  bestCouponCode?: string | null
  bestCouponPrice?: number | null
  pricing?: ProductPricingSummary | null
  onQuickAdd?: (product: Product, size: string) => void
}

export function ProductCard({
  product,
  variants,
  colorways,
  secondaryImage,
  priority = false,
  className = '',
  showTryOnBadge = true,
  badgeLabel,
  signalTag,
  rating,
  reviewCount,
  mrp,
  sellingPrice,
  discountPercentage,
  bestCouponCode,
  bestCouponPrice,
  pricing,
  onQuickAdd,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { isWishlisted: checkWishlisted, toggleWishlist } = useHydratedWishlist()
  const isWishlisted = checkWishlisted(product.id)
  const [addedSize, setAddedSize] = useState<string | null>(null)
  const [selectedColorIdx, setSelectedColorIdx] = useState(0)

  const { isHydrated, isServiceable } = useHydratedBolt()
  const isTryOnEligible = product.is_try_on_eligible !== false
  const shouldShowBoltPill =
    isHydrated && isServiceable && isTryOnEligible && showTryOnBadge !== false

  const addItem = useCartStore((s) => s.addItem)

  const effectiveSecondary = secondaryImage || SECONDARY_IMAGES[product.id]

  // Colorways: strictly derived from explicit prop or distinct variant colors (shown only if > 1)
  const resolvedColorways = useMemo<ProductColorway[]>(() => {
    if (colorways && colorways.length > 0) return colorways
    if (!variants || variants.length === 0) return []

    const seen = new Map<string, ProductColorway>()
    for (const v of variants) {
      const cName = v.color?.trim()
      if (!cName) continue
      const key = cName.toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, {
          name: cName,
          hex: resolveColorHex(cName),
        })
      }
    }
    return Array.from(seen.values())
  }, [colorways, variants])

  const activeColorway =
    resolvedColorways.length > 1 ? resolvedColorways[selectedColorIdx] : undefined

  const activePrimaryImage =
    activeColorway?.imageUrl || product.image_url

  // Deterministically ordered sizes with stock awareness for Quick-Add
  const quickAddSizes = useMemo(() => {
    if (variants && variants.length > 0) {
      const colorFiltered = activeColorway
        ? variants.filter(
            (v) => v.color?.trim().toLowerCase() === activeColorway.name.toLowerCase()
          )
        : variants
      const pool = colorFiltered.length > 0 ? colorFiltered : variants
      const sorted = sortVariantsBySize(pool)
      const bySize = new Map<string, { size: string; stock: number; variantId: string }>()
      for (const v of sorted) {
        const sz = (v.size || '').trim()
        if (!sz) continue
        const existing = bySize.get(sz)
        if (existing) {
          existing.stock += Math.max(0, v.stock || 0)
        } else {
          bySize.set(sz, {
            size: sz,
            stock: Math.max(0, v.stock || 0),
            variantId: v.id,
          })
        }
      }
      return Array.from(bySize.values()).slice(0, 6)
    }

    const isPants =
      product.category?.toLowerCase().includes('pant') ||
      product.category?.toLowerCase().includes('denim')
    const defaults = sortSizes(isPants ? ['30', '32', '34', '36'] : ['S', 'M', 'L', 'XL'])
    const inStock = (product.stock ?? 0) > 0
    return defaults.map((sz) => ({
      size: sz,
      stock: inStock ? product.stock : 0,
      variantId: `${product.id}-${sz}`,
    }))
  }, [variants, activeColorway, product.category, product.id, product.stock])

  // Pricing resolution
  const numPrice = Number(
    sellingPrice !== undefined
      ? sellingPrice
      : pricing?.sellingPrice !== undefined
        ? pricing.sellingPrice
        : product.price
  )
  const originalMrp = Number(
    mrp !== undefined
      ? mrp
      : pricing?.mrp !== undefined
        ? pricing.mrp
        : product.compare_at_price ||
          (discountPercentage && discountPercentage > 0
            ? Math.round((numPrice * 100) / (100 - discountPercentage))
            : 0)
  )
  const effectiveDiscountPct =
    discountPercentage !== undefined
      ? discountPercentage
      : pricing?.discountPercentage !== undefined
        ? pricing.discountPercentage
        : originalMrp > numPrice
          ? Math.round(((originalMrp - numPrice) / originalMrp) * 100)
          : 0

  // Best Price with Coupon (Tier 2)
  const effectiveBestCouponCode = bestCouponCode || pricing?.bestCoupon?.code || null
  const effectiveBestCouponPrice =
    bestCouponPrice !== undefined && bestCouponPrice !== null
      ? bestCouponPrice
      : pricing?.bestCouponPrice && pricing.bestCouponPrice < numPrice
        ? pricing.bestCouponPrice
        : null
  const hasBestCoupon = Boolean(
    effectiveBestCouponCode &&
      effectiveBestCouponPrice !== null &&
      effectiveBestCouponPrice < numPrice
  )

  // Rating & Review count (shown strictly when reviewCount > 0)
  const resolvedReviewCount = Number(reviewCount ?? product.review_count ?? 0)
  const resolvedRating = Number(rating ?? product.average_rating ?? 0)
  const showRatingPill = resolvedReviewCount > 0 && resolvedRating > 0

  // Max 1 Top-Left Signal Badge
  const resolvedSignalTag = useMemo(() => {
    if (signalTag !== undefined) return signalTag
    if (badgeLabel && ['NEW', 'BESTSELLER', 'LOW STOCK'].includes(badgeLabel.toUpperCase())) {
      return badgeLabel.toUpperCase()
    }
    const totalVariantStock =
      variants && variants.length > 0
        ? variants.reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0)
        : product.stock
    if (totalVariantStock > 0 && totalVariantStock <= 5) return 'LOW STOCK'
    if (resolvedReviewCount >= 5 && resolvedRating >= 4.5) return 'BESTSELLER'
    if (product.created_at) {
      const ageDays = (Date.now() - new Date(product.created_at).getTime()) / 86400000
      if (ageDays >= 0 && ageDays <= 14) return 'NEW'
    }
    return null
  }, [signalTag, badgeLabel, variants, product.stock, product.created_at, resolvedReviewCount, resolvedRating])

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  const handleSelectSize = (e: React.MouseEvent, size: string, variantId?: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (onQuickAdd) {
      onQuickAdd(product, size)
    } else {
      const added = addItem({
        id: `${product.id}-${size}`,
        productId: product.id,
        variantId,
        title: product.title,
        category: product.category || 'Apparel',
        edition: product.edition || 'Collection',
        price: numPrice,
        originalPrice: originalMrp > numPrice ? originalMrp : undefined,
        quantity: 1,
        image: activePrimaryImage || '',
        size,
        color: activeColorway?.name,
      })
      if (added) {
        useCartStore.getState().openDrawer()
      }
    }

    setAddedSize(size)
    setTimeout(() => setAddedSize(null), 2000)
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col bg-white transition-colors duration-200 font-sans ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. MEDIA CONTAINER (3:4 Portrait, Zero Clutter)           */}
      {/* ========================================================= */}
      <div className="relative aspect-[3/4] w-full bg-[#f5f5f4] overflow-hidden rounded-sm border border-neutral-200/80">
        <Link href={`/product/${product.id}`} className="block w-full h-full relative">
          <ProductImage
            src={activePrimaryImage}
            alt={product.title}
            fill
            priority={priority}
            className={`transition-opacity duration-300 ${
              isHovered && effectiveSecondary ? 'opacity-0' : 'opacity-100'
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {effectiveSecondary && (
            <ProductImage
              src={effectiveSecondary}
              alt={`${product.title} alternate view`}
              fill
              className={`transition-all duration-300 ${
                isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}
        </Link>

        {/* Top-Left High-Signal Badge (Max 1) */}
        {resolvedSignalTag && (
          <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                resolvedSignalTag === 'LOW STOCK'
                  ? 'bg-[#b91c1c] text-white'
                  : 'bg-[#14293a] text-white'
              }`}
            >
              {resolvedSignalTag}
            </span>
          </div>
        )}

        {/* Top-Right Wishlist Icon */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#14293a] backdrop-blur-sm transition-colors duration-200 flex items-center justify-center z-20 cursor-pointer border border-neutral-200/70"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted
                ? 'fill-[#b91c1c] text-[#b91c1c]'
                : 'text-[#6c7079] hover:text-[#14293a]'
            }`}
            strokeWidth={1.75}
          />
        </button>

        {/* Bottom-Left Rating Pill (strictly when reviewCount > 0) */}
        {showRatingPill && (
          <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-[#14293a] rounded-sm border border-neutral-200/70 tabular-nums">
              <span>{resolvedRating.toFixed(1)}</span>
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" strokeWidth={1.75} />
              <span className="text-neutral-300">|</span>
              <span>{resolvedReviewCount}</span>
            </span>
          </div>
        )}

        {/* Bottom-Right Bolt 45m Badge (only when eligible & serviceable) */}
        {shouldShowBoltPill && (
          <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-[#14293a] rounded-sm border border-neutral-200/70">
              <Zap className="w-3 h-3 fill-[#b91c1c] text-[#b91c1c]" strokeWidth={1.75} />
              <span>45m</span>
            </span>
          </div>
        )}

        {/* Desktop-Only Slide-Up Quick-Add Size Drawer */}
        <div className="hidden sm:block absolute inset-x-0 bottom-0 z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
          {addedSize ? (
            <div className="bg-[#14293a] text-white text-[11px] font-semibold py-2.5 px-3 text-center flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
              <span>Added Size {addedSize} to Bag</span>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md border-t border-neutral-200 px-2.5 py-2 flex items-center justify-center gap-1.5 flex-wrap">
              {quickAddSizes.map((entry) => {
                const isSoldOut = entry.stock <= 0
                return (
                  <button
                    key={entry.size}
                    type="button"
                    disabled={isSoldOut}
                    onClick={(e) => handleSelectSize(e, entry.size, entry.variantId)}
                    className={`h-7 min-w-[28px] px-2 text-[11px] font-semibold border rounded-sm transition-colors flex items-center justify-center ${
                      isSoldOut
                        ? 'border-neutral-200 bg-neutral-50 text-neutral-400 line-through cursor-not-allowed'
                        : 'border-[#d3d6db] bg-white text-[#14293a] hover:bg-[#14293a] hover:text-white hover:border-[#14293a] cursor-pointer'
                    }`}
                    aria-label={isSoldOut ? `Size ${entry.size} sold out` : `Quick add size ${entry.size}`}
                  >
                    {entry.size}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. STRICT 4-LINE METADATA BLOCK (ZERO CATEGORY / MATERIAL)*/}
      {/* ========================================================= */}
      <div className="pt-2.5 pb-1 space-y-1">
        {/* Line 1: Product Name (single-line truncated) */}
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="truncate text-sm font-medium text-neutral-900 group-hover:text-[#b91c1c] transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Line 2: Selling Price + Original MRP + Discount Tag */}
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm font-bold text-neutral-950 tabular-nums">
            ₹{Math.round(numPrice).toLocaleString('en-IN')}
          </span>
          {originalMrp > numPrice && (
            <span className="text-xs text-neutral-400 line-through tabular-nums">
              ₹{Math.round(originalMrp).toLocaleString('en-IN')}
            </span>
          )}
          {effectiveDiscountPct > 0 && (
            <span className="text-xs font-semibold text-emerald-700">
              ({effectiveDiscountPct}% OFF)
            </span>
          )}
        </div>

        {/* Line 3: Dynamic Best Price with Coupon (hidden if no coupon applies) */}
        {hasBestCoupon && effectiveBestCouponPrice !== null && (
          <div className="flex items-baseline gap-1 text-xs truncate">
            <span className="font-semibold text-emerald-700 tabular-nums">
              Best Price ₹{Math.round(effectiveBestCouponPrice).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-neutral-500 truncate">
              with code {effectiveBestCouponCode}
            </span>
          </div>
        )}

        {/* Line 4: Color Swatches (rendered strictly when > 1 colorway) */}
        {resolvedColorways.length > 1 && (
          <div className="pt-1 flex items-center gap-2">
            {resolvedColorways.slice(0, 4).map((cw, idx) => {
              const isSelected = selectedColorIdx === idx
              return (
                <button
                  key={cw.name}
                  type="button"
                  onMouseEnter={() => setSelectedColorIdx(idx)}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedColorIdx(idx)
                  }}
                  title={cw.name}
                  aria-label={`Select color ${cw.name}`}
                  className={`w-3 h-3 rounded-full border border-black/20 transition-transform cursor-pointer ${
                    isSelected ? 'ring-1 ring-offset-2 ring-black scale-105' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: cw.hex }}
                />
              )
            })}
            {resolvedColorways.length > 4 && (
              <span className="text-[11px] font-medium text-neutral-500">
                +{resolvedColorways.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
