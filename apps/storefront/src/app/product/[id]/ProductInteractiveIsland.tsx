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
  Clock,
  Truck,
  AlertTriangle,
  Maximize2,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
  Star,
  Sparkles,
  Layers,
  Scissors,
  HelpCircle,
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
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants.length === 1 ? variants[0]!.id : ''
  )
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
  const selectedVariant = variants.find((v) => v.id === selectedVariantId)
  const activePrice = selectedVariant?.price_override ?? Number(product.price)
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : product.stock <= 0

  const handleAddToCart = (isBoltTryOn: boolean = false) => {
    if (variants.length > 0 && !selectedVariantId) {
      setValidationError('Please select a garment size before adding to your bag.')
      return
    }

    if (isOutOfStock) {
      setValidationError('This size is currently sold out.')
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
    <div className="space-y-16">
      {/* Return Navigation */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalogue</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-400/20 text-amber-800 border border-amber-400/40 font-bold uppercase text-[10px]">
            <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
            Bolt ⚡ Doorstep Eligible
          </span>
          <span className="text-zinc-400 hidden sm:inline">•</span>
          <span className="text-zinc-500 hidden sm:inline">Drop 01 Allocation</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: HERO GALLERY & THUMBNAILS */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Primary Image Container */}
          <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden bg-zinc-100 border border-zinc-200 group">
            <Image
              src={galleryImages[activeImageIndex] || galleryImages[0]!}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover object-center transition-all duration-700 ease-out"
            />

            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-2.5 text-black hover:bg-black hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow"
              title="Expand high-resolution view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="absolute top-4 left-4">
              <span className="text-[10px] uppercase tracking-wider bg-black text-amber-400 px-3 py-1 font-mono font-bold flex items-center gap-1.5 shadow">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Bolt ⚡ Try-On Ready</span>
              </span>
            </div>
          </div>

          {/* Gallery Thumbnail Strips */}
          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-24 w-20 overflow-hidden bg-zinc-100 shrink-0 border transition-all ${
                    activeImageIndex === idx
                      ? 'border-black ring-1 ring-black opacity-100'
                      : 'border-zinc-300 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`Silhouette perspective ${idx + 1}`}
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
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] font-mono text-zinc-400 font-semibold">
              <span>{product.category || 'COLLECTION 01'}</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> In Stock
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-light uppercase text-zinc-900 leading-tight tracking-tight font-sans">
              {product.title}
            </h1>

            {/* Authoritative Price */}
            <div className="flex items-baseline gap-4 pt-1 font-mono">
              <span className="text-2xl sm:text-3xl font-bold text-zinc-900">
                ₹{activePrice.toFixed(2)}
              </span>
              {selectedVariant?.price_override && (
                <span className="text-xs text-zinc-400 line-through">
                  ₹{Number(product.price).toFixed(2)}
                </span>
              )}
              <span className="text-[11px] text-zinc-500 font-normal">
                (Inclusive of all taxes)
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-600 font-light leading-relaxed">
            {product.description ||
              'Engineered with architectural proportions from single-origin combed organic cotton. Built for creators who value textile permanence.'}
          </p>

          {/* Bolt ⚡ Doorstep Try-On Feature Card */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-amber-400 text-black">
                <Zap className="w-3.5 h-3.5 fill-black" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
                Bolt ⚡ White-Glove Doorstep Try-On
              </span>
            </div>
            <p className="text-xs text-zinc-600 font-light leading-relaxed">
              Add this piece to your fitting bag for a <strong>₹99 booking hold</strong>. Try on in your home for 45 minutes. Keep what fits, return the rest on the spot.
            </p>
          </div>

          {/* Fabric Weight Highlight */}
          {product.material && (
            <div className="p-3.5 bg-zinc-100 border border-zinc-200 text-xs font-mono space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 block font-bold">
                Milled Textile Weight:
              </span>
              <p className="text-zinc-900 font-semibold">{product.material}</p>
            </div>
          )}

          {/* Variant Sizing Matrix */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="uppercase text-zinc-800 font-bold tracking-wider">
                Select Size Allocation:
              </span>
              <button
                type="button"
                onClick={() => toggleAccordion('fit')}
                className="text-amber-800 hover:text-black underline underline-offset-4 flex items-center gap-1 font-semibold"
              >
                <Ruler className="w-3 h-3" />
                <span>Size Guide</span>
              </button>
            </div>

            {variants.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {variants.map((v) => {
                  const isSelected = selectedVariantId === v.id
                  const isSoldOut = v.stock <= 0
                  const isLow = v.stock <= 5 && v.stock > 0

                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => {
                        setSelectedVariantId(v.id)
                        setValidationError(null)
                      }}
                      className={`p-3 text-left border transition-all ${
                        isSoldOut
                          ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-40 line-through'
                          : isSelected
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-zinc-300 bg-white hover:border-black text-zinc-900'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-xs sm:text-sm font-mono font-bold ${isSelected ? 'text-amber-400' : ''}`}>
                          {v.size}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                      </div>
                      <div className="mt-1 flex justify-between items-baseline text-[9px] uppercase font-mono opacity-80">
                        <span>{v.color || 'Standard'}</span>
                        <span className={isLow ? 'text-amber-500 font-bold' : isSoldOut ? 'text-rose-500' : ''}>
                          {isSoldOut ? 'Out' : `${v.stock} left`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 border border-zinc-200 bg-white text-xs font-mono text-zinc-800">
                Standard Garment Specification ({product.stock} units available)
              </div>
            )}

            {validationError && (
              <p className="text-xs text-rose-600 font-mono flex items-center gap-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Commerce Action Buttons */}
          <div className="space-y-3 pt-3">
            {/* Primary: Bolt Try-On Button */}
            <button
              type="button"
              onClick={() => handleAddToCart(true)}
              disabled={isOutOfStock}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-black font-mono font-black tracking-widest uppercase text-xs shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4 fill-black" />
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
              className="w-full h-12 bg-black hover:bg-zinc-800 text-white font-mono font-bold tracking-wider uppercase text-xs rounded-none border border-black flex items-center justify-center gap-2 group"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Shopping Bag (₹{activePrice.toFixed(2)})</span>
            </Button>
          </div>

          {/* Added to Bag Feedback Notification */}
          <AnimatePresence>
            {showAddedBanner && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-black text-white text-xs font-mono space-y-2 border border-zinc-800"
              >
                <div className="flex justify-between items-center">
                  <span className="uppercase tracking-wider font-bold text-amber-400 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 fill-amber-400" />
                    Garment Reserved in Fitting Bag
                  </span>
                  <button
                    onClick={() => setShowAddedBanner(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <p className="text-zinc-300">
                  {product.title} {selectedVariant ? `(Size ${selectedVariant.size})` : ''} added.
                </p>
                <Link
                  href="/cart"
                  className="inline-block text-xs uppercase font-bold text-amber-400 hover:underline pt-1"
                >
                  Review Bag & Select Doorstep Time Slot →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================= */}
          {/* ACCORDION DETAILS SECTION */}
          {/* ========================================================= */}
          <div className="border-t border-zinc-200 divide-y divide-zinc-200 font-mono text-xs pt-4">
            {/* Accordion 1: Materials & Care */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('materials')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-zinc-900 py-1"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  Materials & Care
                </span>
                {expandedAccordions.materials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedAccordions.materials && (
                <div className="pt-3 pb-2 text-zinc-600 font-light space-y-2 leading-relaxed">
                  <p>
                    • <strong>Yarn Composition</strong>: 100% long-staple combed cotton, ring-spun for reduced surface friction.
                  </p>
                  <p>
                    • <strong>Knitting Process</strong>: Wakayama loopwheel circular knit (480 GSM) or Okayama shuttle-loom weave (14.5oz selvedge).
                  </p>
                  <p>
                    • <strong>Care Instructions</strong>: Machine wash cold with like colors inside out. Hang dry in shade. Avoid chemical bleach or tumble drying to preserve natural yarn oils.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 2: Shipping, Returns & Bolt Try-On */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('shipping')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-zinc-900 py-1"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-700" />
                  Shipping & Bolt ⚡ Try-On
                </span>
                {expandedAccordions.shipping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedAccordions.shipping && (
                <div className="pt-3 pb-2 text-zinc-600 font-light space-y-2 leading-relaxed">
                  <p>
                    • <strong>Bolt ⚡ Try-On</strong>: Available across Bengaluru, Mumbai, Delhi NCR, and Hyderabad. Choose your preferred 2-hour IST window at checkout. 45-minute fitting salon.
                  </p>
                  <p>
                    • <strong>Standard Delivery</strong>: 2–4 business days insured courier dispatch nationwide.
                  </p>
                  <p>
                    • <strong>Returns</strong>: Instant hand-off during Bolt fitting, or 14-day complimentary pickup on unworn garments with tags attached.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 3: Fit Guide */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion('fit')}
                className="w-full flex items-center justify-between text-left font-bold uppercase tracking-wider text-zinc-900 py-1"
              >
                <span className="flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-amber-700" />
                  Fit & Measurements Matrix
                </span>
                {expandedAccordions.fit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedAccordions.fit && (
                <div className="pt-3 pb-2 space-y-3">
                  <p className="text-zinc-600 font-light">
                    Model is 6&apos;1&quot; (185 cm) wearing Size <strong>L (Taille 02)</strong> for a boxy relaxed drape.
                  </p>

                  <div className="border border-zinc-200 overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-zinc-100 border-b border-zinc-200 text-zinc-800">
                        <tr>
                          <th className="p-2 font-bold">Size</th>
                          <th className="p-2 font-bold">Chest (in)</th>
                          <th className="p-2 font-bold">Length (in)</th>
                          <th className="p-2 font-bold">Sleeve (in)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-600">
                        <tr>
                          <td className="p-2 font-bold text-zinc-900">S</td>
                          <td className="p-2">42</td>
                          <td className="p-2">26.5</td>
                          <td className="p-2">34</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-zinc-900">M</td>
                          <td className="p-2">44</td>
                          <td className="p-2">27.5</td>
                          <td className="p-2">35</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-zinc-900">L</td>
                          <td className="p-2">46</td>
                          <td className="p-2">28.5</td>
                          <td className="p-2">36</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold text-zinc-900">XL</td>
                          <td className="p-2">48</td>
                          <td className="p-2">29.5</td>
                          <td className="p-2">37</td>
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
      <section className="pt-16 border-t border-zinc-200 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-1.5 text-amber-500 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-mono text-zinc-600 font-bold ml-1.5">
                4.9 out of 5.0
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-zinc-900 font-sans">
              Patron Reviews & Doorstep Feedback
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Based on 128 verified fittings across Indian metro zones.
            </p>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="text-right">
              <span className="text-xl font-bold text-zinc-900">96%</span>
              <p className="text-[10px] text-zinc-400 uppercase">Recommended Fit</p>
            </div>
            <div className="text-right border-l border-zinc-200 pl-6">
              <span className="text-xl font-bold text-amber-600">45m</span>
              <p className="text-[10px] text-zinc-400 uppercase">Avg Doorstep Salon</p>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_PDP_REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="p-6 bg-white border border-zinc-200 space-y-3 font-mono text-xs shadow-sm hover:border-black transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Try-On
                </span>
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 text-sm font-sans">
                  &ldquo;{rev.title}&rdquo;
                </h4>
                <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                  Fit: {rev.fitFeedback}
                </p>
              </div>

              <p className="text-zinc-600 font-light leading-relaxed font-sans text-xs">
                {rev.comment}
              </p>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md p-3 border-t border-zinc-200 shadow-2xl flex items-center justify-between gap-3 font-mono">
        <div>
          <p className="text-[10px] text-zinc-400 uppercase">Price</p>
          <p className="text-sm font-bold text-zinc-900">
            ₹{activePrice.toFixed(2)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddToCart(true)}
            disabled={isOutOfStock}
            className="px-4 py-2.5 bg-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 shadow"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Bolt ⚡ Try-On</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddToCart(false)}
            disabled={isOutOfStock}
            className="p-2.5 bg-black text-white hover:bg-zinc-800"
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
            className="absolute top-6 right-6 text-white p-2 hover:opacity-75"
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
