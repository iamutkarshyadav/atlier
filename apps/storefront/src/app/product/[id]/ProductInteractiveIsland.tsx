'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Check,
  Ruler,
  Truck,
  AlertTriangle,
  Maximize2,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { useCartStore } from '../../../store/useCartStore'
import type { Product, ProductVariant, ProductMedia } from '@repo/supabase/utils'

interface ProductInteractiveIslandProps {
  product: Product
  variants: ProductVariant[]
  media: ProductMedia[]
}

const MOCK_PDP_REVIEWS = [
  {
    id: 'rev-pdp-1',
    author: 'Devansh K.',
    city: 'Koramangala, Bengaluru',
    date: '3 days ago',
    rating: 5,
    title: 'The 480 GSM weight is extraordinary.',
    fitFeedback: 'True to Size • Relaxed Boxy Fit',
    comment:
      'The fabric is noticeably thicker and stiffer than standard luxury hoodies. It holds its silhouette without collapsing. The Bolt doorstep fitting was effortless — the courier waited while I checked the mirror in my foyer.',
    verified: true,
  },
  {
    id: 'rev-pdp-2',
    author: 'Meera Sengupta',
    city: 'Bandra, Mumbai',
    date: '1 week ago',
    rating: 5,
    title: 'Flawless stitching and zero chemical smell.',
    fitFeedback: 'Slightly Oversized (Recommended)',
    comment:
      'You can immediately tell this was woven on vintage looms without polyester blending. The unbleached organic cotton feels substantial and breathable. Best try-on experience I have had in India.',
    verified: true,
  },
  {
    id: 'rev-pdp-3',
    author: 'Raghav Varma',
    date: '2 weeks ago',
    city: 'Golf Links, New Delhi',
    rating: 5,
    title: 'Ordered 2 sizes with Bolt, kept the Large.',
    fitFeedback: 'True to Size',
    comment:
      'Being able to try both Medium and Large at home before spending ₹13,000 was a lifesaver. Handed the Medium back to the courier and paid via GPay in 15 seconds.',
    verified: true,
  },
  {
    id: 'rev-pdp-4',
    author: 'Siddharth Rao',
    date: '3 weeks ago',
    city: 'Hitec City, Hyderabad',
    rating: 4,
    title: 'Exceptional craftsmanship, dense ribbing.',
    fitFeedback: 'Structured Boxy Fit',
    comment:
      'The sleeve cuffs and bottom hem are double-needle reinforced. Only giving 4 stars because the drop sold out so fast in my colorway, but the product itself is 10/10.',
    verified: true,
  },
]

export function ProductInteractiveIsland({
  product,
  variants,
  media,
}: ProductInteractiveIslandProps) {
  const addItem = useCartStore((s) => s.addItem)

  // Gallery images: use product_media if available, fallback to product.image_url
  const galleryImages =
    media.length > 0
      ? media.map((m) => m.url)
      : [product.image_url || '/images/prod1-primary.jpg', '/images/auth-editorial.jpg']

  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // STRICT INVENTORY FILTER: ONLY AVAILABLE SIZES IN STOCK (stock > 0)
  const availableVariants = variants.filter((v) => v.stock > 0)
  const hasVariants = variants.length > 0

  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    if (availableVariants.length === 1) {
      return availableVariants[0]!.id
    }
    return ''
  })

  const [quantity, setQuantity] = useState(1)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [showAddedBanner, setShowAddedBanner] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

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

  // Selected variant derivation
  const selectedVariant = availableVariants.find((v) => v.id === selectedVariantId)
  const activePrice = selectedVariant?.price_override ?? Number(product.price)
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
      title: product.title,
      category: product.category || 'Apparel',
      edition: product.edition || 'Drop 01',
      price: activePrice,
      quantity,
      image: galleryImages[0] || '/images/prod1-primary.jpg',
      size: selectedVariant
        ? `${selectedVariant.size}${selectedVariant.color ? ` (${selectedVariant.color})` : ''}`
        : undefined,
    })

    if (!success) {
      setIsAdding(false)
      setValidationError('Bolt ⚡ Try-On accommodates up to 5 garments per fitting session. Limit reached.')
      return
    }

    setTimeout(() => {
      setIsAdding(false)
      setShowAddedBanner(true)
    }, 300)
  }

  return (
    <div className="space-y-12">
      {/* Return Navigation & Breadcrumb */}
      <div className="flex justify-between items-center border-b border-[#E4E4E0] pb-3">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#52525B] hover:text-[#09090B] transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalogue</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 text-[#B91C1C] border border-red-200 font-bold uppercase text-[10px] rounded-none">
            <Zap className="w-3 h-3 fill-[#B91C1C] text-[#B91C1C]" />
            Bolt ⚡ Doorstep Eligible
          </span>
          <span className="text-neutral-300 hidden sm:inline">•</span>
          <span className="text-[#71717A] hidden sm:inline">Drop 01 Allocation</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: HERO GALLERY & THUMBNAILS (VIEWPORT BOUNDED) */}
        {/* Guarantees main image + thumbnails fit in screen view box */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-20">
          {/* Main Primary Image Container */}
          <div className="relative w-full h-[360px] sm:h-[420px] lg:h-[440px] xl:h-[480px] max-h-[calc(100vh-210px)] overflow-hidden bg-white border border-[#E4E4E0] group shadow-sm rounded-none flex items-center justify-center">
            <Image
              src={galleryImages[activeImageIndex] || galleryImages[0]!}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center transition-all duration-500 ease-out"
            />

            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md p-2 text-white hover:bg-black transition-colors opacity-0 group-hover:opacity-100 shadow rounded-none cursor-pointer"
              title="Expand high-resolution view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="absolute top-3 left-3">
              <span className="text-[10px] uppercase tracking-wider bg-[#B91C1C] text-white px-2.5 py-1 font-mono font-bold flex items-center gap-1.5 shadow rounded-none">
                <Zap className="w-3 h-3 fill-white" />
                <span>Bolt ⚡ Try-On Ready</span>
              </span>
            </div>
          </div>

          {/* Gallery Thumbnail Strip (Immediately Below Main Image) */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 shrink-0 filter-card-scroll">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-16 w-14 lg:h-18 lg:w-16 overflow-hidden bg-white shrink-0 border-2 transition-all cursor-pointer rounded-none ${
                    activeImageIndex === idx
                      ? 'border-[#09090B] ring-1 ring-[#09090B] opacity-100'
                      : 'border-[#E4E4E0] opacity-65 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`Perspective ${idx + 1}`}
                    fill
                    className="object-cover object-center"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: PRODUCT INFO & COMMERCE CONTROLS */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] font-mono font-semibold">
              <span className="text-[#B91C1C] font-bold text-[11px]">{product.category || 'COLLECTION 01'}</span>
              <span className="text-[#047857] font-bold text-[11px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                <Check className="w-3 h-3" /> In Stock
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-4xl xl:text-5xl font-black uppercase text-[#09090B] leading-[1.05] tracking-tight font-display">
              {product.title}
            </h1>

            {/* Authoritative Price (High Contrast Obsidian) */}
            <div className="flex items-baseline gap-3 pt-0.5 font-mono">
              <span className="pdp-price-text text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#09090B] tracking-tight">
                ₹{activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {selectedVariant?.price_override && (
                <span className="text-sm text-neutral-400 line-through">
                  ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              <span className="text-[11px] text-[#71717A] font-medium">
                (Inclusive of all taxes &amp; duties)
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#52525B] font-normal leading-relaxed">
            {product.description ||
              'Engineered with architectural proportions from single-origin combed organic cotton. Built for creators who value textile permanence.'}
          </p>

          {/* Bolt ⚡ Doorstep Try-On Feature Card (Clean Light Luxury Aesthetic) */}
          <div className="p-4 bg-white border border-[#E4E4E0] space-y-2 rounded-none shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-50 text-[#B91C1C] border border-red-200 rounded-none">
                  <Zap className="w-3.5 h-3.5 fill-[#B91C1C] text-[#B91C1C]" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#09090B]">
                  Bolt ⚡ White-Glove Doorstep Try-On
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-neutral-100 text-[#09090B] font-bold border border-[#E4E4E0]">
                ₹99 Booking Hold
              </span>
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Add this piece to your fitting bag for a <strong className="text-[#09090B] font-semibold">₹99 hold</strong>. Try on in your home for 45 minutes with a dedicated courier. Keep what fits, return the rest on the spot.
            </p>
          </div>

          {/* Fabric Weight Highlight */}
          {product.material && (
            <div className="p-3 bg-white border border-[#E4E4E0] text-xs font-mono space-y-0.5 rounded-none shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-[#71717A] block font-bold">
                Milled Textile Weight &amp; Composition:
              </span>
              <p className="text-[#09090B] font-semibold">{product.material}</p>
            </div>
          )}

          {/* Available Sizes Matrix (Dark Colors, Available Sizes Only) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="uppercase text-[#09090B] font-bold tracking-wider flex items-center gap-1.5">
                <span>Select Size Allocation:</span>
                {hasVariants && availableVariants.length > 0 && (
                  <span className="text-[10px] text-[#71717A] font-normal">
                    ({availableVariants.length} sizes in stock)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => toggleAccordion('fit')}
                className="text-[#B91C1C] hover:text-[#991B1B] underline underline-offset-4 flex items-center gap-1 font-semibold cursor-pointer text-xs"
              >
                <Ruler className="w-3 h-3" />
                <span>Size Guide</span>
              </button>
            </div>

            {hasVariants ? (
              availableVariants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableVariants.map((v) => {
                    const isSelected = selectedVariantId === v.id
                    const isLow = v.stock <= 3

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(v.id)
                          setValidationError(null)
                        }}
                        className={`pdp-size-btn px-4 py-2.5 min-w-[76px] text-center font-mono transition-all rounded-none cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'pdp-size-btn-selected !bg-[#000000] !text-white !border-black shadow-md ring-2 ring-black'
                            : '!bg-[#18181B] !text-white !border-[#27272A] hover:!bg-[#27272A] shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold tracking-wider text-white">
                            {v.size}
                          </span>
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <span className={`text-[9px] uppercase tracking-wider ${isLow ? 'text-amber-400 font-bold' : 'text-neutral-400'}`}>
                          {isLow ? `${v.stock} left` : `${v.stock} avail`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 bg-neutral-100 text-[#52525B] border border-[#E4E4E0] text-xs font-mono flex items-center justify-between">
                  <span>All garment sizes currently sold out.</span>
                  <span className="text-rose-600 font-bold uppercase text-[10px]">Sold Out</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="pdp-size-btn px-4 py-2.5 !bg-[#18181B] !text-white !border-black font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm rounded-none"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standard Sizing</span>
                </button>
                <span className="text-xs font-mono text-[#52525B]">
                  ({product.stock > 0 ? `${product.stock} units available in inventory` : 'Sold out'})
                </span>
              </div>
            )}

            {validationError && (
              <p className="text-xs text-rose-600 font-mono flex items-center gap-1.5 pt-0.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Commerce Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* Primary: Bolt Try-On Button */}
            <button
              type="button"
              onClick={() => handleAddToCart(true)}
              disabled={isOutOfStock}
              className="w-full py-4 bg-[#09090B] hover:bg-[#27272A] text-white font-mono font-bold tracking-widest uppercase text-xs shadow-md hover:shadow-[0_12px_32px_-4px_rgba(220,38,38,0.5),0_4px_14px_-2px_rgba(185,28,28,0.35)] flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all rounded-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-black"
            >
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>
                {isOutOfStock ? 'CURRENTLY SOLD OUT' : 'TRY-ON AT HOME (₹99 HOLD)'}
              </span>
            </button>

            {/* Secondary: Standard Add to Bag */}
            <Button
              onClick={() => handleAddToCart(false)}
              size="lg"
              disabled={isOutOfStock}
              isLoading={isAdding}
              className="w-full h-11 bg-white hover:bg-neutral-50 hover:shadow-[0_10px_25px_-3px_rgba(220,38,38,0.35)] text-[#09090B] font-mono font-bold tracking-wider uppercase text-xs rounded-none border-2 border-[#09090B] flex items-center justify-center gap-2 group transition-all shadow-sm disabled:opacity-40"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#09090B]" />
              <span>
                Add to Shopping Bag (₹{activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </Button>
          </div>

          {/* Added to Bag Feedback Notification */}
          <AnimatePresence>
            {showAddedBanner && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-white text-[#09090B] text-xs font-mono space-y-2 border border-[#E4E4E0] rounded-none shadow-xl"
              >
                <div className="flex justify-between items-center">
                  <span className="uppercase tracking-wider font-bold text-[#B91C1C] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 fill-[#B91C1C]" />
                    Garment Reserved in Fitting Bag
                  </span>
                  <button
                    onClick={() => setShowAddedBanner(false)}
                    className="text-[#71717A] hover:text-[#09090B] text-sm"
                  >
                    ×
                  </button>
                </div>
                <p className="text-[#52525B]">
                  {product.title} {selectedVariant ? `(Size ${selectedVariant.size})` : ''} added.
                </p>
                <Link
                  href="/cart"
                  className="inline-block text-xs uppercase font-bold text-[#B91C1C] hover:underline pt-1"
                >
                  Review Bag &amp; Select Doorstep Time Slot →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================= */}
          {/* ACCORDION DETAILS SECTION (UNDERSTATED LUXURY) */}
          {/* ========================================================= */}
          <div className="border-t border-[#E4E4E0] divide-y divide-[#E4E4E0] font-mono text-xs pt-3">
            {/* Accordion 1: Materials & Care */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('materials')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-[#09090B] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#09090B]" />
                  Materials &amp; Artisanal Craft
                </span>
                {expandedAccordions.materials ? <ChevronUp className="w-4 h-4 text-[#71717A]" /> : <ChevronDown className="w-4 h-4 text-[#71717A]" />}
              </button>

              {expandedAccordions.materials && (
                <div className="pt-2.5 pb-1 text-[#52525B] font-light space-y-2 leading-relaxed">
                  <p>
                    • <strong className="text-[#09090B] font-medium">Yarn Composition</strong>: 100% long-staple combed cotton, ring-spun for reduced surface friction.
                  </p>
                  <p>
                    • <strong className="text-[#09090B] font-medium">Knitting Process</strong>: Wakayama loopwheel circular knit (480 GSM) or Okayama shuttle-loom weave (14.5oz selvedge).
                  </p>
                  <p>
                    • <strong className="text-[#09090B] font-medium">Care Instructions</strong>: Machine wash cold with like colors inside out. Hang dry in shade. Avoid chemical bleach or tumble drying to preserve natural yarn oils.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 2: Shipping, Returns & Bolt Try-On */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('shipping')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-[#09090B] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#09090B]" />
                  Shipping &amp; Bolt ⚡ Try-On Protocols
                </span>
                {expandedAccordions.shipping ? <ChevronUp className="w-4 h-4 text-[#71717A]" /> : <ChevronDown className="w-4 h-4 text-[#71717A]" />}
              </button>

              {expandedAccordions.shipping && (
                <div className="pt-2.5 pb-1 text-[#52525B] font-light space-y-2 leading-relaxed">
                  <p>
                    • <strong className="text-[#09090B] font-medium">Bolt ⚡ Try-On</strong>: Available across Bengaluru, Mumbai, Delhi NCR, and Hyderabad. Choose your preferred 2-hour IST window at checkout. 45-minute white-glove doorstep fitting salon.
                  </p>
                  <p>
                    • <strong className="text-[#09090B] font-medium">Standard Delivery</strong>: 2–4 business days insured courier dispatch nationwide.
                  </p>
                  <p>
                    • <strong className="text-[#09090B] font-medium">Returns</strong>: Instant hand-off during Bolt fitting, or 14-day complimentary pickup on unworn garments with tags attached.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 3: Fit Guide */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('fit')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-[#09090B] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-[#09090B]" />
                  Architectural Fit &amp; Measurements Matrix
                </span>
                {expandedAccordions.fit ? <ChevronUp className="w-4 h-4 text-[#71717A]" /> : <ChevronDown className="w-4 h-4 text-[#71717A]" />}
              </button>

              {expandedAccordions.fit && (
                <div className="pt-2.5 pb-1 space-y-2.5">
                  <p className="text-[#52525B]">
                    Model is 6&apos;1&quot; (185 cm) wearing Size <strong className="text-[#09090B]">L (Taille 02)</strong> for a boxy relaxed drape.
                  </p>

                  <div className="border border-[#E4E4E0] bg-white overflow-x-auto rounded-none shadow-sm">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-neutral-100 border-b border-[#E4E4E0] text-[#09090B]">
                        <tr>
                          <th className="p-2.5 font-bold">Size</th>
                          <th className="p-2.5 font-bold">Chest (in)</th>
                          <th className="p-2.5 font-bold">Length (in)</th>
                          <th className="p-2.5 font-bold">Sleeve (in)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E4E0] text-[#52525B]">
                        <tr>
                          <td className="p-2.5 font-bold text-[#09090B]">S</td>
                          <td className="p-2.5">42</td>
                          <td className="p-2.5">26.5</td>
                          <td className="p-2.5">34</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-[#09090B]">M</td>
                          <td className="p-2.5">44</td>
                          <td className="p-2.5">27.5</td>
                          <td className="p-2.5">35</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-[#09090B]">L</td>
                          <td className="p-2.5">46</td>
                          <td className="p-2.5">28.5</td>
                          <td className="p-2.5">36</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-[#09090B]">XL</td>
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

      {/* ========================================================= */}
      {/* REVIEWS & SOCIAL PROOF SECTION */}
      {/* ========================================================= */}
      <section className="pt-12 border-t border-[#E4E4E0] space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[#E4E4E0]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#71717A] mb-1.5">
              <span className="text-[#B91C1C] font-bold">[ VERIFIED TRIAL RECORD ]</span>
              <span>•</span>
              <span className="text-[#09090B] font-bold">RATING: 4.9 / 5.0</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#09090B] font-display">
              Patron Reviews &amp; Doorstep Feedback
            </h2>
            <p className="text-xs text-[#71717A] font-mono mt-0.5">
              Based on 128 verified fittings across Indian metro zones.
            </p>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="text-right">
              <span className="text-xl font-bold text-[#09090B]">96%</span>
              <p className="text-[10px] text-[#71717A] uppercase">Recommended Fit</p>
            </div>
            <div className="text-right border-l border-[#E4E4E0] pl-6">
              <span className="text-xl font-bold text-[#B91C1C]">45m</span>
              <p className="text-[10px] text-[#71717A] uppercase">Avg Doorstep Salon</p>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MOCK_PDP_REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="p-5 bg-white border border-[#E4E4E0] space-y-2.5 font-mono text-xs shadow-sm rounded-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-wider text-[#09090B]">
                  RATING: {rev.rating}.0 / 5.0
                </span>

                <span className="inline-flex items-center gap-1 text-[10px] text-[#B91C1C] bg-red-50 border border-red-200 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-[#B91C1C]" />
                  Verified Try-On
                </span>
              </div>

              <div>
                <h4 className="font-bold text-[#09090B] text-sm font-sans">
                  &ldquo;{rev.title}&rdquo;
                </h4>
                <p className="text-[11px] text-[#B91C1C] font-semibold mt-0.5">
                  Fit: {rev.fitFeedback}
                </p>
              </div>

              <p className="text-[#52525B] font-light leading-relaxed font-sans text-xs">
                {rev.comment}
              </p>

              <div className="pt-2.5 border-t border-[#E4E4E0] flex items-center justify-between text-[11px] text-[#71717A]">
                <span>{rev.author} • {rev.city}</span>
                <span>{rev.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* MOBILE STICKY ACTION BAR */}
      {/* ========================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md p-3 border-t border-[#E4E4E0] shadow-xl flex items-center justify-between gap-3 font-mono">
        <div>
          <p className="text-[10px] text-[#71717A] uppercase">Price</p>
          <p className="text-sm font-bold text-[#09090B]">
            ₹{activePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddToCart(true)}
            disabled={isOutOfStock}
            className="px-4 py-2.5 bg-[#09090B] hover:bg-[#27272A] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow rounded-none cursor-pointer disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Bolt ⚡ Try-On</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddToCart(false)}
            disabled={isOutOfStock}
            className="p-2.5 bg-white text-[#09090B] hover:bg-neutral-100 border border-[#09090B] rounded-none cursor-pointer disabled:opacity-40"
            aria-label="Add to bag"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 text-white p-2 hover:opacity-75 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-[80vh]">
            <Image
              src={galleryImages[activeImageIndex] || galleryImages[0]!}
              alt="High resolution garment inspection"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
