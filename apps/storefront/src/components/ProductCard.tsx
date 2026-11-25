'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, Heart, Check, ShoppingBag, Tag } from 'lucide-react'
import type { Product } from '@repo/supabase/utils'
import { useCartStore } from '../store/useCartStore'
import { useHydratedWishlist } from '../store/useWishlistStore'

export const SECONDARY_IMAGES: Record<string, string> = {
  'b1000000-0000-0000-0000-000000000001': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000002': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000003': 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000004': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000005': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000006': 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1200&q=85',
}

const COLOR_SWATCHES: Record<string, string[]> = {
  'Hoodies & Fleece': ['#1C1C1C', '#E5E0D8', '#4A5568'],
  'Tees & Tops': ['#1C1C1C', '#FAF8F5', '#3A3F47'],
  'Outerwear & Jackets': ['#1C1C1C', '#3F443E', '#2B303A'],
  'Pants & Denim': ['#1B2A4A', '#1C1C1C', '#DCD6CD'],
}

export interface ProductCardProps {
  product: Product & { compare_at_price?: number | null; extra_offer_tag?: string | null }
  secondaryImage?: string
  priority?: boolean
  className?: string
  showTryOnBadge?: boolean
  showReassuranceLine?: boolean
  badgeLabel?: string
  mrp?: number
  sellingPrice?: number
  discountPercentage?: number
  extraOfferTag?: string
  onQuickAdd?: (product: Product, size: string) => void
}

export function ProductCard({
  product,
  secondaryImage,
  priority = false,
  className = '',
  showTryOnBadge = true,
  showReassuranceLine = true,
  badgeLabel,
  mrp,
  sellingPrice,
  discountPercentage,
  extraOfferTag,
  onQuickAdd,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { isWishlisted: checkWishlisted, toggleWishlist } = useHydratedWishlist()
  const isWishlisted = checkWishlisted(product.id)
  const [addedSize, setAddedSize] = useState<string | null>(null)
  const [selectedColorIdx, setSelectedColorIdx] = useState(0)

  const addItem = useCartStore((s) => s.addItem)

  const effectiveSecondary = secondaryImage || SECONDARY_IMAGES[product.id]
  const isPants =
    product.category?.toLowerCase().includes('pant') ||
    product.category?.toLowerCase().includes('denim')
  const sizes = isPants ? ['30', '32', '34'] : ['S', 'M', 'L', 'XL']

  const categorySwatches =
    (product.category && COLOR_SWATCHES[product.category]) || ['#1C1C1C', '#F0EAE1', '#2A303C']

  const numPrice = Number(sellingPrice !== undefined ? sellingPrice : product.price)
  const originalMrp = Number(
    mrp !== undefined
      ? mrp
      : (product as any).compare_at_price ||
        (discountPercentage && discountPercentage > 0
          ? Math.round((numPrice * 100) / (100 - discountPercentage))
          : null)
  )
  const effectiveDiscountPct =
    discountPercentage !== undefined
      ? discountPercentage
      : originalMrp && originalMrp > numPrice
        ? Math.round(((originalMrp - numPrice) / originalMrp) * 100)
        : 0
  const effectiveOfferTag = extraOfferTag || (product as any).extra_offer_tag

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  const handleSelectSize = (e: React.MouseEvent, size: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (onQuickAdd) {
      onQuickAdd(product, size)
    } else {
      addItem({
        id: `${product.id}-${size}`,
        productId: product.id,
        title: product.title,
        category: product.category || 'Atelier Collection',
        edition: 'Permanent Collection',
        price: numPrice,
        originalPrice: originalMrp && originalMrp > numPrice ? originalMrp : undefined,
        quantity: 1,
        image: product.image_url || '',
        size,
      })
    }

    setAddedSize(size)
    setTimeout(() => setAddedSize(null), 2200)
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col bg-white transition-all duration-300 font-sans ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. MEDIA CONTAINER (Full Bleed Aspect 3/4)                 */}
      {/* ========================================================= */}
      <div className="relative aspect-[3/4] w-full bg-[#f4f4f4] overflow-hidden rounded-xs border border-neutral-200/60 shadow-xs group-hover:shadow-md transition-shadow duration-300">
        <Link href={`/product/${product.id}`} className="block w-full h-full relative">
          {product.image_url ? (
            <>
              <Image
                src={product.image_url}
                alt={product.title}
                fill
                priority={priority}
                className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                  isHovered && effectiveSecondary ? 'opacity-0' : 'opacity-100'
                }`}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {effectiveSecondary && (
                <Image
                  src={effectiveSecondary}
                  alt={`${product.title} alternate view`}
                  fill
                  className={`object-cover transition-all duration-700 ease-out ${
                    isHovered ? 'opacity-100 scale-105' : 'opacity-0'
                  }`}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#8a909a] text-xs font-semibold">
              NO IMAGE
            </div>
          )}
        </Link>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
          {showTryOnBadge && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 backdrop-blur-md text-[#b91c1c] text-[10px] font-sans uppercase font-bold tracking-wider rounded-full shadow-xs border border-red-100">
              <Zap className="w-2.5 h-2.5 fill-[#b91c1c]" />
              <span>{badgeLabel || 'Try-On'}</span>
            </span>
          )}
          {!showTryOnBadge && badgeLabel && (
            <span className="px-2.5 py-0.5 bg-[#14293a] text-white text-[10px] font-sans uppercase font-bold tracking-wider rounded-full shadow-xs">
              {badgeLabel}
            </span>
          )}
        </div>

        {/* Top Right Wishlist Floating Button */}
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#14293a] backdrop-blur-md shadow-xs transition-all duration-200 flex items-center justify-center hover:scale-110 z-20 cursor-pointer border border-neutral-200/60"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted
                ? 'fill-[#b91c1c] text-[#b91c1c]'
                : 'text-[#6c7079] hover:text-[#14293a]'
            }`}
          />
        </button>

        {/* Quick Add Size Strip (Slide up on hover / desktop, static overlay on mobile) */}
        <div className="absolute inset-x-0 bottom-0 z-20 transition-transform duration-300 ease-out sm:translate-y-full sm:group-hover:translate-y-0">
          {addedSize ? (
            <div className="bg-[#14293a] text-white text-[11px] font-bold py-2.5 px-3 text-center flex items-center justify-center gap-1.5 shadow-md">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Added Size {addedSize} to Bag</span>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md border-t border-neutral-200/80 p-2 sm:p-2.5 flex items-center justify-between shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] hidden xs:inline">
                Quick Add:
              </span>
              <div className="flex items-center gap-1.5 w-full xs:w-auto justify-center">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={(e) => handleSelectSize(e, sz)}
                    className="h-7 min-w-[28px] px-2 text-[11px] font-bold text-[#14293a] hover:bg-[#14293a] hover:text-white border border-[#d3d6db] rounded-sm transition-colors cursor-pointer bg-white flex items-center justify-center"
                    aria-label={`Add size ${sz}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PRODUCT DETAILS & METADATA HIERARCHY                   */}
      {/* ========================================================= */}
      <div className="pt-3 pb-1 space-y-1">
        {/* Category & Color Swatches */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] text-[#6c7079]">
            {product.category || 'Atelier Archive'}
          </span>

          {/* Color Dots */}
          <div className="flex items-center gap-1" title="Available Colorways">
            {categorySwatches.map((hex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedColorIdx(i)}
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  selectedColorIdx === i
                    ? 'ring-1 ring-[#14293a] ring-offset-1 border-neutral-400'
                    : 'border-black/20 hover:scale-110'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={`Color option ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Product Title */}
        <Link href={`/product/${product.id}`} className="block group-hover:text-[#b91c1c] transition-colors">
          <h3 className="text-xs sm:text-sm font-semibold text-[#14293a] leading-snug line-clamp-1">
            {product.title}
          </h3>
        </Link>

        {/* Fabric / Material Tag */}
        {product.material && (
          <p className="text-[11px] text-[#8a909a] font-sans line-clamp-1">
            {product.material}
          </p>
        )}

        {/* Price Row (Flipkart / Myntra Strikethrough & % OFF Badge) */}
        <div className="pt-0.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-xs sm:text-sm font-bold font-sans tabular-nums text-[#14293a]">
            ₹{numPrice.toLocaleString('en-IN')}
          </span>
          {originalMrp && originalMrp > numPrice && (
            <span className="text-[11px] text-[#8a909a] font-sans line-through tabular-nums">
              ₹{originalMrp.toLocaleString('en-IN')}
            </span>
          )}
          {effectiveDiscountPct > 0 && (
            <span className="text-[10px] font-sans font-bold text-[#b91c1c] tracking-tight">
              ({effectiveDiscountPct}% OFF)
            </span>
          )}
        </div>

        {/* Subtle Extra Offer Tag */}
        {effectiveOfferTag && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#b91c1c] pt-0.5">
            <Tag className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{effectiveOfferTag}</span>
          </div>
        )}

        {/* Micro Doorstep Try-On Reassurance Chip */}
        {showTryOnBadge && showReassuranceLine && (
          <div className="pt-0.5 flex items-center gap-1 text-[10px] text-[#065f46] font-medium font-sans">
            <Zap className="w-2.5 h-2.5 text-[#065f46]" />
            <span>45-min Doorstep Fitting available</span>
          </div>
        )}
      </div>
    </div>
  )
}
