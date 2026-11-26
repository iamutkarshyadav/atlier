'use client'

import React, { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductImage } from '@/components/ui/ProductImage'
import { SECONDARY_IMAGES } from '@/components/ProductCard'
import { resolveColorHex } from '@/components/shop/ShopFilterPanel'
import { StickyAddToCartBar } from '@/components/product/StickyAddToCartBar'
import { sortVariantsBySize } from '@repo/supabase/utils'
import {
  BOLT_HOLD_FEE,
  FREE_SHIPPING_THRESHOLD,
  type ProductPricingSummary,
  type ApplicableOfferSummary,
} from '@repo/supabase/pricing'
import {
  ShoppingBag,
  Check,
  Copy,
  Ruler,
  Truck,
  AlertTriangle,
  Maximize2,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
  Layers,
  Heart,
  Tag,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { useCartStore } from '../../../store/useCartStore'
import { useHydratedWishlist } from '../../../store/useWishlistStore'
import { useHydratedBolt } from '../../../store/useBoltStore'
import type { Product, ProductVariant, ProductMedia } from '@repo/supabase/utils'

interface ProductInteractiveIslandProps {
  product: Product
  variants: ProductVariant[]
  media: ProductMedia[]
  initialPricing?: ProductPricingSummary
}

function getModelSizingContext(product: Product): string {
  const haystack = `${product.title} ${product.category || ''} ${product.description || ''}`.toLowerCase()
  if (haystack.includes('kurta') || haystack.includes('tailored') || haystack.includes('shirt') || haystack.includes('blazer')) {
    return 'Model is 6\'0" wearing size L — Tailored Regular Fit'
  }
  if (haystack.includes('denim') || haystack.includes('trouser') || haystack.includes('pant') || haystack.includes('chino')) {
    return 'Model is 6\'0" (32" waist) wearing size 32 — Straight Fit'
  }
  return 'Model is 5\'11" wearing size L — Relaxed Fit'
}

export function ProductInteractiveIsland({
  product,
  variants,
  media,
  initialPricing,
}: ProductInteractiveIslandProps) {
  const addItem = useCartStore((s) => s.addItem)
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode)
  const { isWishlisted: checkWishlisted, toggleWishlist } = useHydratedWishlist()
  const isWishlisted = checkWishlisted(product.id)

  const ctaBlockRef = useRef<HTMLDivElement | null>(null)
  const sizeBlockRef = useRef<HTMLDivElement | null>(null)

  // Gallery images: product_media first, otherwise product.image_url + known secondary perspective
  const galleryImages = useMemo(() => {
    if (media.length > 0) return media.map((m) => m.url)
    const primary = product.image_url || '/images/placeholder-garment.svg'
    const secondary = SECONDARY_IMAGES[product.id]
    return secondary && secondary !== primary ? [primary, secondary] : [primary]
  }, [media, product.id, product.image_url])

  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Deterministic size ordering across all variants
  const sortedVariants = useMemo(() => sortVariantsBySize(variants), [variants])

  // Extract distinct colorways cleanly
  const colorOptions = useMemo(() => {
    const map = new Map<string, { name: string; hex: string; hasStock: boolean }>()
    for (const v of sortedVariants) {
      const colorName = v.color?.trim()
      if (!colorName) continue
      const key = colorName.toLowerCase()
      const existing = map.get(key)
      if (existing) {
        existing.hasStock = existing.hasStock || v.stock > 0
      } else {
        map.set(key, {
          name: colorName,
          hex: resolveColorHex(colorName),
          hasStock: v.stock > 0,
        })
      }
    }
    return Array.from(map.values())
  }, [sortedVariants])

  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    const firstInStock = colorOptions.find((c) => c.hasStock)
    return firstInStock?.name ?? colorOptions[0]?.name ?? null
  })

  // Variants filtered by active colorway (with deterministic size sorting preserved)
  const variantsForColor = useMemo(() => {
    if (!selectedColor || colorOptions.length === 0) return sortedVariants
    return sortedVariants.filter(
      (v) => (v.color || '').trim().toLowerCase() === selectedColor.toLowerCase()
    )
  }, [sortedVariants, selectedColor, colorOptions.length])

  const availableVariants = useMemo(
    () => variantsForColor.filter((v) => v.stock > 0),
    [variantsForColor]
  )
  const hasVariants = sortedVariants.length > 0

  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    if (availableVariants.length === 1) {
      return availableVariants[0]!.id
    }
    return ''
  })

  const [validationError, setValidationError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [showAddedBanner, setShowAddedBanner] = useState(false)
  const [addedViaBolt, setAddedViaBolt] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [showPinChecker, setShowPinChecker] = useState(false)

  // Accordion state
  const [expandedAccordions, setExpandedAccordions] = useState<{
    materials: boolean
    shipping: boolean
    fit: boolean
  }>({
    materials: true,
    shipping: false,
    fit: false,
  })

  const toggleAccordion = (key: keyof typeof expandedAccordions) => {
    setExpandedAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSelectColor = (nextColor: string) => {
    setSelectedColor(nextColor)
    setValidationError(null)
    const nextColorVariants = sortedVariants.filter(
      (v) => (v.color || '').trim().toLowerCase() === nextColor.toLowerCase()
    )
    const currentSize = variantsForColor.find((v) => v.id === selectedVariantId)?.size
    if (currentSize) {
      const matchingSizeVariant = nextColorVariants.find(
        (v) => v.size === currentSize && v.stock > 0
      )
      if (matchingSizeVariant) {
        setSelectedVariantId(matchingSizeVariant.id)
        return
      }
    }
    const nextAvailable = nextColorVariants.filter((v) => v.stock > 0)
    setSelectedVariantId(nextAvailable.length === 1 ? nextAvailable[0]!.id : '')
  }

  // Selected variant derivation & live pricing resolution
  const selectedVariant = availableVariants.find((v) => v.id === selectedVariantId)
  const variantPrice = selectedVariant?.price_override ?? Number(product.price)
  const mrp =
    initialPricing?.mrp ??
    (Number((product as { compare_at_price?: number | null }).compare_at_price) > variantPrice
      ? Number((product as { compare_at_price?: number | null }).compare_at_price)
      : variantPrice)
  const sellingPrice = initialPricing?.sellingPrice ?? variantPrice
  const discountPercentage =
    initialPricing?.discountPercentage ??
    (mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0)
  const bestCouponPrice = initialPricing?.bestCouponPrice ?? sellingPrice
  const bestCoupon = initialPricing?.bestCoupon ?? null
  const applicableOffers = initialPricing?.applicableOffers ?? []

  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedOfferTerms, setSelectedOfferTerms] = useState<ApplicableOfferSummary | null>(null)

  const appliedCouponCode = useCartStore((s) => s.appliedCouponCode)
  const applyCouponCode = useCartStore((s) => s.applyCouponCode)
  const removeCouponCode = useCartStore((s) => s.removeCouponCode)

  const isBestCouponApplied = Boolean(
    appliedCouponCode &&
    bestCoupon &&
    appliedCouponCode.toUpperCase() === bestCoupon.code.toUpperCase()
  )

  const handleToggleBestCoupon = async () => {
    if (!bestCoupon) return
    if (isBestCouponApplied) {
      removeCouponCode()
    } else {
      await applyCouponCode(bestCoupon.code)
    }
  }

  // Bolt Try-On Hydration-Safe PIN gating
  const { pincode, city, isServiceable, isHydrated, setPincode, clearPincode } = useHydratedBolt()
  const [pinInput, setPinInput] = useState('')
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [pinFeedback, setPinFeedback] = useState<string | null>(null)

  const handleVerifyPin = async () => {
    const trimmed = pinInput.trim()
    if (trimmed.length !== 6) return
    setIsVerifyingPin(true)
    setPinFeedback(null)
    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (data.serviceable) {
        setPincode(trimmed, true, data.city || null)
        setPinFeedback(null)
        setShowPinChecker(false)
        if (typeof document !== 'undefined') {
          document.cookie = `bolt_pincode=${encodeURIComponent(trimmed)}; path=/; max-age=31536000`
          document.cookie = `bolt_serviceable=1; path=/; max-age=31536000`
        }
      } else {
        setPincode(trimmed, false, null)
        setPinFeedback(
          data.message ||
            `PIN ${trimmed} is outside our 45-minute rapid try-on radius. Standard express shipping applies.`
        )
        if (typeof document !== 'undefined') {
          document.cookie = `bolt_pincode=${encodeURIComponent(trimmed)}; path=/; max-age=31536000`
          document.cookie = `bolt_serviceable=0; path=/; max-age=31536000`
        }
      }
    } catch {
      setPinFeedback('Unable to verify postal code serviceability. Please try again.')
    } finally {
      setIsVerifyingPin(false)
    }
  }

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const isTryOnEligible = product.is_try_on_eligible !== false
  const activePrice = isBestCouponApplied && bestCouponPrice < sellingPrice ? bestCouponPrice : sellingPrice
  const isOutOfStock = hasVariants
    ? availableVariants.length === 0 || (selectedVariantId ? !selectedVariant || selectedVariant.stock <= 0 : false)
    : product.stock <= 0

  const handleAddToCart = (isBoltTryOn: boolean = false) => {
    if (hasVariants && availableVariants.length > 0 && !selectedVariantId) {
      setValidationError('Please select an available garment size before proceeding.')
      return
    }

    if (isOutOfStock) {
      setValidationError('This piece is currently sold out.')
      return
    }

    setValidationError(null)
    setIsAdding(true)

    const success = addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      title: product.title,
      category: product.category || 'Apparel',
      edition: product.edition || 'Collection',
      price: activePrice,
      originalPrice: mrp > activePrice ? mrp : undefined,
      quantity: 1,
      image: galleryImages[0] || '/images/placeholder-garment.svg',
      size: selectedVariant?.size,
      color: selectedVariant?.color || selectedColor || undefined,
    })

    if (!success) {
      setIsAdding(false)
      setValidationError('Bolt Try-On accommodates up to 5 garments per fitting session. Limit reached.')
      return
    }

    if (isBoltTryOn && isTryOnEligible) {
      setDeliveryMode('try_on')
    }
    setAddedViaBolt(isBoltTryOn && isTryOnEligible)

    setTimeout(() => {
      setIsAdding(false)
      setShowAddedBanner(true)
      useCartStore.getState().openDrawer()
    }, 200)
  }

  const scrollToSizeSelector = () => {
    setValidationError('Select your size below to add this piece to your bag.')
    sizeBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const modelSizingText = useMemo(() => getModelSizingContext(product), [product])

  return (
    <div className="space-y-10 font-sans text-[#14293a]">
      {/* 1. BREADCRUMBS */}
      <nav className="text-xs text-[#6c7079] mb-4 font-sans border-b border-[#e5e7eb] pb-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
        <span> / </span>
        <Link href="/shop" className="hover:text-[#14293a] transition-colors">Shop</Link>
        {product.category && (
          <>
            <span> / </span>
            <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-[#14293a] transition-colors">
              {product.category}
            </Link>
          </>
        )}
        <span> / </span>
        <span className="text-[#14293a] font-semibold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* 2. MAIN 2-COLUMN PDP LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT COLUMN: STICKY PORTRAIT GALLERY */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-3 lg:sticky lg:top-24">
          {galleryImages.length > 1 && (
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 md:w-20 max-h-[680px] pb-1 md:pb-0">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-24 w-18 md:w-20 md:h-28 overflow-hidden bg-[#f8f8f8] shrink-0 border transition-all cursor-pointer rounded-sm ${
                    activeImageIndex === idx
                      ? 'border-[#14293a] ring-1 ring-[#14293a] opacity-100'
                      : 'border-[#d3d6db] opacity-70 hover:opacity-100'
                  }`}
                >
                  <ProductImage
                    src={imgUrl}
                    alt={`${product.title} view ${idx + 1}`}
                    fill
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Portrait 3:4 Image Container */}
          <div className="relative flex-1 aspect-[3/4] max-h-[720px] overflow-hidden bg-[#f5f5f4] border border-[#d3d6db] group rounded-sm flex items-center justify-center">
            <ProductImage
              src={galleryImages[activeImageIndex] || galleryImages[0]}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="transition-all duration-300"
            />

            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-[#14293a] p-2 rounded-sm border border-[#d3d6db] transition-colors cursor-pointer"
              title="Expand high-resolution view"
              aria-label="Expand image"
            >
              <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: BUY-BOX & COMMERCE CONTROLS */}
        <div className="lg:col-span-5 space-y-5">
          {/* Category + Title + Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#b91c1c] font-bold uppercase tracking-wider text-[11px]">
                {product.category || 'Atelier Silhouette'}
              </span>
              <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-sm">
                <Check className="w-3 h-3" strokeWidth={1.75} /> In Stock
              </span>
            </div>

            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#14293a] leading-tight tracking-tight">
              {product.title}
            </h1>

            {/* Price Tag with Strikethrough & % OFF */}
            <div className="flex flex-wrap items-baseline gap-2.5 pt-1">
              <span className="text-2xl sm:text-3xl font-bold tabular-nums text-[#14293a]">
                ₹{Math.round(sellingPrice).toLocaleString('en-IN')}
              </span>
              {mrp > sellingPrice && (
                <span className="text-base text-[#8a909a] tabular-nums line-through">
                  ₹{Math.round(mrp).toLocaleString('en-IN')}
                </span>
              )}
              {discountPercentage > 0 && (
                <span className="text-sm font-bold text-[#b91c1c] tracking-tight">
                  ({discountPercentage}% OFF)
                </span>
              )}
              <span className="text-xs text-[#6c7079] w-full sm:w-auto">
                Inclusive of all taxes
              </span>
            </div>

            {/* Best Price with Coupon Callout directly below PDP Price */}
            {bestCoupon && bestCouponPrice < sellingPrice && (
              <div className="pt-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-sm">
                  <div className="flex items-center gap-2 text-xs">
                    <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" strokeWidth={1.75} />
                    <span>
                      <strong className="text-emerald-800 font-bold">
                        Best Price ₹{Math.round(bestCouponPrice).toLocaleString('en-IN')}
                      </strong>{' '}
                      <span className="text-[#52565e]">
                        with coupon{' '}
                        <strong className="font-mono text-[#14293a]">{bestCoupon.code}</strong>
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(bestCoupon.code)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-semibold border border-[#d3d6db] bg-white text-[#14293a] hover:border-[#14293a] rounded-sm transition-colors cursor-pointer"
                    >
                      {copiedCode === bestCoupon.code ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" strokeWidth={1.75} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" strokeWidth={1.75} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleBestCoupon}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider border rounded-sm transition-colors cursor-pointer ${
                        isBestCouponApplied
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-[#14293a] text-white border-[#14293a] hover:bg-[#b91c1c] hover:border-[#b91c1c]'
                      }`}
                    >
                      {isBestCouponApplied ? (
                        <>
                          <Check className="w-3 h-3" strokeWidth={1.75} />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>Auto-Apply</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Applicable Offers List */}
          {applicableOffers.length > 0 && (
            <div className="p-3.5 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#14293a] flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-[#b91c1c]" strokeWidth={1.75} />
                Available Offers ({applicableOffers.length})
              </span>
              <div className="space-y-1.5 text-xs">
                {applicableOffers.map((offer, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <p className="text-[#52565e] leading-snug text-xs min-w-0">
                      <strong className="font-semibold text-[#14293a]">{offer.name}:</strong>{' '}
                      {offer.description || offer.badgeText}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {offer.code && (
                        <button
                          type="button"
                          onClick={() => handleCopyCode(offer.code!)}
                          className="text-[10px] font-mono font-bold text-[#b91c1c] hover:underline cursor-pointer"
                        >
                          {copiedCode === offer.code ? 'Copied' : offer.code}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedOfferTerms(offer)}
                        className="text-[10px] text-[#6c7079] hover:text-[#14293a] underline cursor-pointer"
                      >
                        T&amp;C
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editorial Description */}
          <p className="text-xs sm:text-sm text-[#52565e] leading-relaxed">
            {product.description ||
              'Engineered with architectural proportions from single-origin combed organic cotton. Built for creators who value textile permanence.'}
          </p>

          {/* Color Selector directly above SELECT SIZE */}
          {colorOptions.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase text-[#14293a] font-bold tracking-wider">
                  Color:{' '}
                  <span className="font-semibold normal-case text-[#52565e]">
                    {selectedColor}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {colorOptions.map((col) => {
                  const isActive =
                    selectedColor?.toLowerCase() === col.name.toLowerCase()
                  return (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => handleSelectColor(col.name)}
                      title={col.hasStock ? col.name : `${col.name} (Out of stock)`}
                      aria-label={`Select color ${col.name}`}
                      aria-pressed={isActive}
                      className={`relative w-7 h-7 rounded-full border border-neutral-300 transition-all cursor-pointer ${
                        isActive ? 'ring-2 ring-offset-2 ring-[#14293a]' : 'hover:scale-105'
                      } ${!col.hasStock ? 'opacity-45' : ''}`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {!col.hasStock && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 top-1/2 h-[1.5px] -rotate-45 bg-[#b91c1c]"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Size Selector Matrix */}
          <div ref={sizeBlockRef} className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="uppercase text-[#14293a] font-bold tracking-wider flex items-center gap-1.5">
                <span>Select Size</span>
                {hasVariants && availableVariants.length > 0 && (
                  <span className="text-[11px] text-[#6c7079] font-normal normal-case">
                    ({availableVariants.length} in stock)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setExpandedAccordions((prev) => ({ ...prev, fit: true }))
                }}
                className="text-[#b91c1c] hover:underline flex items-center gap-1 font-semibold cursor-pointer text-xs"
              >
                <Ruler className="w-3 h-3" strokeWidth={1.75} />
                <span>Size Guide</span>
              </button>
            </div>

            {/* Model Sizing Context line directly above size pills */}
            <p className="text-xs text-[#6c7079] flex items-center gap-1.5">
              <span>{modelSizingText}</span>
            </p>

            {hasVariants ? (
              variantsForColor.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {variantsForColor.map((v) => {
                    const isSelected = selectedVariantId === v.id
                    const inStock = v.stock > 0
                    const isLow = inStock && v.stock <= 3

                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!inStock}
                        onClick={() => {
                          setSelectedVariantId(v.id)
                          setValidationError(null)
                        }}
                        className={`px-4 py-2.5 min-w-[70px] text-center transition-all rounded-sm flex flex-col items-center justify-center gap-0.5 border ${
                          !inStock
                            ? 'bg-[#f5f5f4] text-[#9ca3af] border-[#e5e7eb] line-through cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'bg-[#14293a] text-white border-[#14293a] cursor-pointer'
                              : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold">{v.size}</span>
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={1.75} />}
                        </div>
                        <span
                          className={`text-[10px] uppercase ${
                            !inStock
                              ? 'text-[#9ca3af]'
                              : isLow
                                ? 'text-amber-500 font-bold'
                                : isSelected
                                  ? 'text-neutral-300'
                                  : 'text-[#8a909a]'
                          }`}
                        >
                          {!inStock ? 'Sold Out' : isLow ? `${v.stock} left` : 'In Stock'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 bg-[#f8f8f8] text-[#6c7079] border border-[#d3d6db] text-xs flex items-center justify-between rounded-sm">
                  <span>All garment sizes currently sold out.</span>
                  <span className="text-[#b91c1c] font-bold uppercase text-[10px]">Sold Out</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-[#14293a] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-sm"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
                  <span>Standard Sizing</span>
                </button>
                <span className="text-xs text-[#6c7079]">
                  ({product.stock > 0 ? `${product.stock} units available` : 'Sold out'})
                </span>
              </div>
            )}

            {validationError && (
              <p className="text-xs text-[#b91c1c] flex items-center gap-1.5 pt-0.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#b91c1c]" strokeWidth={1.75} />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Commerce Action Buttons (Observed for StickyAddToCartBar) */}
          <div ref={ctaBlockRef} className="space-y-3 pt-1">
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => handleAddToCart(false)}
                size="lg"
                disabled={isOutOfStock}
                isLoading={isAdding}
                className="flex-1 h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold tracking-wider uppercase text-xs rounded-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              >
                <ShoppingBag className="w-4 h-4 text-white" strokeWidth={1.75} />
                <span>
                  ADD TO CART (₹{Math.round(activePrice).toLocaleString('en-IN')})
                </span>
              </Button>

              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`h-12 px-4 border rounded-sm flex items-center justify-center gap-2 text-xs font-bold font-sans tracking-wider uppercase transition-colors cursor-pointer shrink-0 ${
                  isWishlisted
                    ? 'border-[#b91c1c] bg-[#fef2f2] text-[#b91c1c]'
                    : 'border-[#14293a] text-[#14293a] bg-white hover:bg-[#f8f8f8]'
                }`}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart
                  strokeWidth={1.75}
                  className={`w-4 h-4 ${
                    isWishlisted ? 'fill-[#b91c1c] text-[#b91c1c]' : 'text-[#14293a]'
                  }`}
                />
                <span className="hidden sm:inline">
                  {isWishlisted ? 'WISHLISTED' : 'WISHLIST'}
                </span>
              </button>
            </div>

            {isTryOnEligible && (
              <button
                type="button"
                onClick={() => handleAddToCart(true)}
                disabled={isOutOfStock}
                className="w-full py-3.5 bg-white hover:bg-[#f8f8f8] text-[#14293a] font-sans font-bold tracking-wider uppercase text-xs border border-[#14293a] flex items-center justify-center gap-2 rounded-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" strokeWidth={1.75} />
                <span>
                  {isOutOfStock
                    ? 'CURRENTLY SOLD OUT'
                    : `TRY AT HOME WITH BOLT (₹${BOLT_HOLD_FEE} HOLD)`}
                </span>
              </button>
            )}

            {/* Sleek 1-Line Bolt & Delivery Trust Strip directly beneath CTAs */}
            <div className="pt-2 border-t border-[#e5e7eb] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#52565e]">
                {!isTryOnEligible ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#14293a] shrink-0" strokeWidth={1.75} />
                    <span>
                      Standard Express Delivery · Free above ₹{FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')}
                    </span>
                  </span>
                ) : isHydrated && isServiceable && pincode ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
                      <span>
                        45-min try-on active in{' '}
                        <strong className="text-[#14293a]">{city || pincode}</strong> · ₹{BOLT_HOLD_FEE} hold credited if kept
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPinChecker((prev) => !prev)}
                      className="text-[11px] font-semibold text-[#14293a] underline hover:text-[#b91c1c] cursor-pointer"
                    >
                      Change PIN
                    </button>
                  </>
                ) : isHydrated && pincode && !isServiceable ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#14293a] shrink-0" strokeWidth={1.75} />
                      <span>
                        Standard Express to <strong className="text-[#14293a]">{pincode}</strong> · Free above ₹{FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPinChecker((prev) => !prev)}
                      className="text-[11px] font-semibold text-[#14293a] underline hover:text-[#b91c1c] cursor-pointer"
                    >
                      Change PIN
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
                      <span>
                        45-min doorstep try-on (₹{BOLT_HOLD_FEE} hold) · Free shipping above ₹{FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPinChecker((prev) => !prev)}
                      className="text-[11px] font-semibold text-[#14293a] underline hover:text-[#b91c1c] cursor-pointer"
                    >
                      Check PIN
                    </button>
                  </>
                )}
              </div>

              {showPinChecker && isTryOnEligible && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="Enter 6-digit PIN"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, ''))
                      setPinFeedback(null)
                    }}
                    className="h-8 px-2.5 text-xs border border-[#d3d6db] rounded-sm focus:border-[#14293a] focus:outline-none w-36 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    disabled={pinInput.trim().length !== 6 || isVerifyingPin}
                    onClick={handleVerifyPin}
                    className="h-8 px-3 bg-[#14293a] text-white text-[11px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isVerifyingPin ? 'Checking...' : 'Verify'}
                  </button>
                  {pincode && (
                    <button
                      type="button"
                      onClick={() => {
                        clearPincode()
                        setPinInput('')
                        setPinFeedback(null)
                        setShowPinChecker(false)
                      }}
                      className="text-[11px] text-[#6c7079] hover:text-[#14293a] underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  {pinFeedback && (
                    <p className="text-[11px] text-amber-800 font-medium w-full">{pinFeedback}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fabric Weight Highlight */}
          {product.material && (
            <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] text-xs space-y-0.5 rounded-sm">
              <span className="text-[10px] uppercase tracking-wider text-[#6c7079] block font-bold">
                Fabric &amp; Material
              </span>
              <p className="text-[#14293a] font-semibold">{product.material}</p>
            </div>
          )}

          {/* Added to Bag Feedback Notification */}
          <AnimatePresence>
            {showAddedBanner && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-[#ecfdf5] text-[#065f46] text-xs space-y-2 border border-[#a7f3d0] rounded-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="uppercase tracking-wider font-bold text-[#065f46] flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#065f46]" strokeWidth={1.75} />
                    {addedViaBolt ? 'Added for Bolt Try-On' : 'Garment Added to Bag'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddedBanner(false)}
                    className="text-[#065f46] hover:text-[#064e3b] cursor-pointer"
                    aria-label="Dismiss added notice"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
                <p className="text-[#064e3b]">
                  {product.title} {selectedVariant ? `(Size ${selectedVariant.size})` : ''} has been added.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    href="/cart"
                    className="text-xs uppercase font-bold text-[#b91c1c] hover:underline"
                  >
                    View Bag &amp; Checkout →
                  </Link>
                  <Link
                    href="/shop"
                    className="text-xs uppercase font-semibold text-[#065f46] hover:underline"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================= */}
          {/* ACCORDION DETAILS SECTION (Fabindia Pattern)              */}
          {/* ========================================================= */}
          <div className="border-t border-[#d3d6db] divide-y divide-[#e5e7eb] text-xs pt-3">
            {/* Accordion 1: Materials & Care */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('materials')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-[#14293a] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#14293a]" />
                  Product Details &amp; Fabric Care
                </span>
                {expandedAccordions.materials ? <ChevronUp className="w-4 h-4 text-[#6c7079]" /> : <ChevronDown className="w-4 h-4 text-[#6c7079]" />}
              </button>

              {expandedAccordions.materials && (
                <div className="pt-2.5 pb-1 text-[#6c7079] space-y-2 leading-relaxed">
                  <p>
                    • <strong className="text-[#14293a] font-medium">Textile Craft</strong>: 100% natural long-staple combed cotton or Okayama raw selvedge denim. Zero polyester blending.
                  </p>
                  <p>
                    • <strong className="text-[#14293a] font-medium">Origin &amp; Mill</strong>: Wakayama loopwheel circular knit (480 GSM) or vintage shuttle-loom weave.
                  </p>
                  <p>
                    • <strong className="text-[#14293a] font-medium">Care Instructions</strong>: Machine wash cold inside out with similar colors. Line dry in shade. Do not bleach.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 2: Shipping, Returns & Bolt Try-On */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('shipping')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-[#14293a] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#14293a]" />
                  Delivery, Bolt Try-On &amp; Returns
                </span>
                {expandedAccordions.shipping ? <ChevronUp className="w-4 h-4 text-[#6c7079]" /> : <ChevronDown className="w-4 h-4 text-[#6c7079]" />}
              </button>

              {expandedAccordions.shipping && (
                <div className="pt-2.5 pb-1 text-[#6c7079] space-y-2 leading-relaxed">
                  <p>
                    • <strong className="text-[#14293a] font-medium">Bolt Doorstep Try-On</strong>: Active across serviceable metro pincodes. Choose your preferred 2-hour window at checkout. 45-minute doorstep try-on session.
                  </p>
                  <p>
                    • <strong className="text-[#14293a] font-medium">Standard Delivery</strong>: 2–4 business days complimentary dispatch nationwide on orders above ₹1,999.
                  </p>
                  <p>
                    • <strong className="text-[#14293a] font-medium">Hassle-Free Returns</strong>: Instant hand-off during Bolt fitting, or 14-day doorstep return pickup.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 3: Fit Guide */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('fit')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-[#14293a] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-[#14293a]" />
                  Size Guide &amp; Measurement Chart
                </span>
                {expandedAccordions.fit ? <ChevronUp className="w-4 h-4 text-[#6c7079]" /> : <ChevronDown className="w-4 h-4 text-[#6c7079]" />}
              </button>

              {expandedAccordions.fit && (
                <div className="pt-2.5 pb-1 space-y-2.5">
                  <p className="text-[#6c7079]">
                    Model is 6&apos;1&quot; (185 cm) wearing Size <strong className="text-[#14293a]">L</strong> for a relaxed drape.
                  </p>

                  <div className="border border-[#d3d6db] bg-[#f8f8f8] overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#e5e7eb] border-b border-[#d3d6db] text-[#14293a]">
                        <tr>
                          <th className="p-2.5 font-bold">Size</th>
                          <th className="p-2.5 font-bold">Chest (in)</th>
                          <th className="p-2.5 font-bold">Length (in)</th>
                          <th className="p-2.5 font-bold">Sleeve (in)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d3d6db] text-[#6c7079]">
                        <tr>
                          <td className="p-2.5 font-bold text-[#14293a]">S</td>
                          <td className="p-2.5">42</td>
                          <td className="p-2.5">26.5</td>
                          <td className="p-2.5">34</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-[#14293a]">M</td>
                          <td className="p-2.5">44</td>
                          <td className="p-2.5">27.5</td>
                          <td className="p-2.5">35</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-[#14293a]">L</td>
                          <td className="p-2.5">46</td>
                          <td className="p-2.5">28.5</td>
                          <td className="p-2.5">36</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-[#14293a]">XL</td>
                          <td className="p-2.5">48</td>
                          <td className="p-2.5">29.5</td>
                          <td className="p-2.5">37</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ overscrollBehavior: 'contain' }}
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 text-white p-2 hover:opacity-75 cursor-pointer"
            aria-label="Close image viewer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-[80vh]">
            <ProductImage
              src={galleryImages[activeImageIndex] || galleryImages[0]}
              alt="High resolution garment inspection"
              fill
              portrait={false}
              className="!object-contain"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* OFFER TERMS & CONDITIONS MODAL                            */}
      {/* ========================================================= */}
      {selectedOfferTerms && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#d3d6db] rounded-sm max-w-md w-full p-6 space-y-4 shadow-2xl relative font-sans text-[#14293a]">
            <button
              onClick={() => setSelectedOfferTerms(null)}
              className="absolute top-4 right-4 p-1 text-[#8a909a] hover:text-[#14293a] rounded-xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#e5e7eb] pb-3">
              <span className="text-2xs font-mono font-bold uppercase tracking-widest text-[#b91c1c]">
                Offer Terms &amp; Conditions
              </span>
              <h3 className="text-lg font-sans font-bold text-[#14293a] mt-0.5">
                {selectedOfferTerms.name}
              </h3>
            </div>

            <div className="space-y-3 text-xs text-[#6c7079]">
              <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xs space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-[#14293a] block">
                  Offer Details:
                </span>
                <p className="text-xs text-[#14293a]">
                  {selectedOfferTerms.description || selectedOfferTerms.badgeText}
                </p>
              </div>

              <ul className="space-y-1.5 list-disc list-inside text-xs text-[#6c7079]">
                {selectedOfferTerms.minOrderSubtotal ? (
                  <li>
                    Minimum cart order value required: <strong>₹{selectedOfferTerms.minOrderSubtotal.toLocaleString('en-IN')}</strong>
                  </li>
                ) : (
                  <li>No minimum order value required.</li>
                )}
                {selectedOfferTerms.maxDiscountAmount && (
                  <li>
                    Maximum discount capped at <strong>₹{selectedOfferTerms.maxDiscountAmount.toLocaleString('en-IN')}</strong>.
                  </li>
                )}
                {selectedOfferTerms.code && (
                  <li>
                    Valid with promotional code <strong>{selectedOfferTerms.code}</strong> at checkout.
                  </li>
                )}
                <li>
                  Applicable across permanent archive and selected seasonal silhouettes.
                </li>
                <li>
                  Strict margin-floor protection is maintained; cannot be applied below supplier costs.
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#e5e7eb] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOfferTerms(null)}
                className="px-4 py-2 bg-[#14293a] text-white text-xs font-mono uppercase font-bold tracking-wider rounded-xs cursor-pointer"
              >
                Close Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Add-to-Cart Bar */}
      <StickyAddToCartBar
        targetRef={ctaBlockRef}
        title={product.title}
        imageUrl={galleryImages[0] || '/images/placeholder-garment.svg'}
        activePrice={activePrice}
        mrp={mrp}
        selectedColor={selectedColor}
        selectedSize={selectedVariant?.size}
        isOutOfStock={isOutOfStock}
        isTryOnEligible={isTryOnEligible}
        isAdding={isAdding}
        onAddToCart={handleAddToCart}
        onSelectSizePrompt={scrollToSizeSelector}
      />
    </div>
  )
}
