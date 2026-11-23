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
  ChevronRight,
  Layers,
  Star,
  Heart,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { useCartStore } from '../../../store/useCartStore'
import { useHydratedWishlist } from '../../../store/useWishlistStore'
import type { Product, ProductVariant, ProductMedia } from '@repo/supabase/utils'

interface ProductInteractiveIslandProps {
  product: Product
  variants: ProductVariant[]
  media: ProductMedia[]
}

export function ProductInteractiveIsland({
  product,
  variants,
  media,
}: ProductInteractiveIslandProps) {
  const addItem = useCartStore((s) => s.addItem)
  const { isWishlisted: checkWishlisted, toggleWishlist } = useHydratedWishlist()
  const isWishlisted = checkWishlisted(product.id)

  // Gallery images: use product_media if available, fallback to product.image_url
  const galleryImages =
    media.length > 0
      ? media.map((m) => m.url)
      : [product.image_url || '/images/prod1-primary.jpg', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85']

  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Filter available variants in stock
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
      variantId: selectedVariant?.id,
      title: product.title,
      category: product.category || 'Apparel',
      edition: product.edition || 'Collection',
      price: activePrice,
      quantity,
      image: galleryImages[0] || '/images/prod1-primary.jpg',
      size: selectedVariant
        ? `${selectedVariant.size}${selectedVariant.color ? ` (${selectedVariant.color})` : ''}`
        : undefined,
      color: selectedVariant?.color || undefined,
    })

    if (!success) {
      setIsAdding(false)
      setValidationError('Bolt Try-On accommodates up to 5 garments per fitting session. Limit reached.')
      return
    }

    setTimeout(() => {
      setIsAdding(false)
      setShowAddedBanner(true)
    }, 300)
  }

  return (
    <div className="space-y-10 font-sans text-[#14293a]">
      {/* ========================================================= */}
      {/* 1. BREADCRUMBS                                            */}
      {/* ========================================================= */}
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

      {/* ========================================================= */}
      {/* 2. MAIN 2-COLUMN PDP LAYOUT (Flipkart / Amazon Pattern)   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: PRODUCT GALLERY & THUMBNAILS                 */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-3 lg:sticky lg:top-28">
          {/* Gallery Thumbnail Column */}
          {galleryImages.length > 1 && (
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 md:w-20 max-h-[580px] pb-1 md:pb-0">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-20 w-16 md:w-20 md:h-24 overflow-hidden bg-[#f8f8f8] shrink-0 border-2 transition-all cursor-pointer rounded-sm ${
                    activeImageIndex === idx
                      ? 'border-[#14293a] ring-1 ring-[#14293a] opacity-100'
                      : 'border-[#d3d6db] opacity-70 hover:opacity-100'
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

          {/* Main Primary Image Container */}
          <div className="relative flex-1 aspect-[4/5] max-h-[580px] overflow-hidden bg-[#f8f8f8] border border-[#d3d6db] group shadow-sm rounded-sm flex items-center justify-center">
            <Image
              src={galleryImages[activeImageIndex] || galleryImages[0]!}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center transition-all duration-300"
            />

            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-[#14293a] p-2 rounded-sm shadow transition-colors cursor-pointer"
              title="Expand high-resolution view"
              aria-label="Expand image"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: STICKY BUY-BOX & COMMERCE CONTROLS         */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#b91c1c] font-bold uppercase tracking-wider text-[11px]">
                {product.category || 'Atelier Silhouette'}
              </span>
              <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-sm">
                <Check className="w-3 h-3" /> In Stock
              </span>
            </div>

            <h1 className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-[#14293a] leading-tight tracking-tight">
              {product.title}
            </h1>

            {/* Price Tag with Tax Disclaimer */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-bold tabular-nums text-[#14293a]">
                ₹{Math.round(activePrice).toLocaleString('en-IN')}
              </span>
              {selectedVariant?.price_override && (
                <span className="text-sm text-[#8a909a] tabular-nums line-through">
                  ₹{Math.round(Number(product.price)).toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xs text-[#6c7079]">
                (Inclusive of all taxes &amp; duties)
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
            {product.description ||
              'Engineered with architectural proportions from single-origin combed organic cotton. Built for creators who value textile permanence.'}
          </p>

          {/* Bolt Doorstep Try-On Feature Card */}
          <div className="p-4 bg-[#f8f8f8] border border-[#d3d6db] space-y-2 rounded-sm shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] rounded-sm">
                  <Zap className="w-3.5 h-3.5 text-[#b91c1c]" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                  Bolt 45-Min Try-On
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-white text-[#14293a] border border-[#d3d6db] rounded-sm">
                ₹99 Booking Hold
              </span>
            </div>
            <p className="text-xs text-[#6c7079] leading-relaxed">
              Add this piece to your fitting bag for a <strong className="text-[#14293a]">₹99 hold</strong>. Try on in your home for 45 minutes with a dedicated courier. Keep what fits, return the rest on the spot.
            </p>
          </div>

          {/* Fabric Weight Highlight */}
          {product.material && (
            <div className="p-3 bg-[#f8f8f8] border border-[#d3d6db] text-xs space-y-0.5 rounded-sm">
              <span className="text-[10px] uppercase tracking-wider text-[#6c7079] block font-bold">
                Fabric &amp; Material:
              </span>
              <p className="text-[#14293a] font-semibold">{product.material}</p>
            </div>
          )}

          {/* Available Sizes Matrix */}
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="uppercase text-[#14293a] font-bold tracking-wider flex items-center gap-1.5">
                <span>Select Size:</span>
                {hasVariants && availableVariants.length > 0 && (
                  <span className="text-[11px] text-[#6c7079] font-normal">
                    ({availableVariants.length} sizes in stock)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => toggleAccordion('fit')}
                className="text-[#b91c1c] hover:underline flex items-center gap-1 font-semibold cursor-pointer text-xs"
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
                        className={`px-4 py-2.5 min-w-[70px] text-center transition-all rounded-sm cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                          isSelected
                            ? 'bg-[#14293a] text-white border-[#14293a] shadow-sm'
                            : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a]'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold">
                            {v.size}
                          </span>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-[10px] uppercase ${isLow ? 'text-amber-500 font-bold' : isSelected ? 'text-neutral-300' : 'text-[#8a909a]'}`}>
                          {isLow ? `${v.stock} left` : 'In Stock'}
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
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standard Sizing</span>
                </button>
                <span className="text-xs text-[#6c7079]">
                  ({product.stock > 0 ? `${product.stock} units available` : 'Sold out'})
                </span>
              </div>
            )}

            {validationError && (
              <p className="text-xs text-[#b91c1c] flex items-center gap-1.5 pt-0.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#b91c1c]" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Commerce Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Primary: Standard Add to Bag + Wishlist Outline Action */}
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => handleAddToCart(false)}
                size="lg"
                disabled={isOutOfStock}
                isLoading={isAdding}
                className="flex-1 h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold tracking-wider uppercase text-xs rounded-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
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
                  className={`w-4 h-4 ${
                    isWishlisted ? 'fill-[#b91c1c] text-[#b91c1c]' : 'text-[#14293a]'
                  }`}
                />
                <span className="hidden sm:inline">
                  {isWishlisted ? 'WISHLISTED' : 'WISHLIST'}
                </span>
              </button>
            </div>

            {/* Secondary: Bolt Try-On Button */}
            <button
              type="button"
              onClick={() => handleAddToCart(true)}
              disabled={isOutOfStock}
              className="w-full py-3.5 bg-white hover:bg-[#f8f8f8] text-[#14293a] font-sans font-bold tracking-wider uppercase text-xs border-2 border-[#14293a] flex items-center justify-center gap-2 rounded-sm transition-all shadow-sm disabled:opacity-40"
            >
              <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" />
              <span>
                {isOutOfStock ? 'CURRENTLY SOLD OUT' : 'TRY AT HOME WITH BOLT (₹99 HOLD)'}
              </span>
            </button>
          </div>

          {/* Added to Bag Feedback Notification */}
          <AnimatePresence>
            {showAddedBanner && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-[#ecfdf5] text-[#065f46] text-xs space-y-2 border border-[#a7f3d0] rounded-sm shadow-md"
              >
                <div className="flex justify-between items-center">
                  <span className="uppercase tracking-wider font-bold text-[#065f46] flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#065f46]" />
                    Garment Added to Bag
                  </span>
                  <button
                    onClick={() => setShowAddedBanner(false)}
                    className="text-[#065f46] hover:text-[#064e3b] text-sm"
                  >
                    ×
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
