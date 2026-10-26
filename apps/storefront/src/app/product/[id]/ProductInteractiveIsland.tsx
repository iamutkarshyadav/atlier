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
} from 'lucide-react'
import { Button } from '@repo/ui'
import { useCartStore } from '../../../store/useCartStore'
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

  // Selected variant derivation
  const selectedVariant = variants.find((v) => v.id === selectedVariantId)
  const activePrice = selectedVariant?.price_override ?? Number(product.price)
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : product.stock <= 0

  const handleAddToCart = () => {
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

    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      title: product.title,
      category: product.category || 'Apparel',
      edition: product.edition || 'Drop 01',
      price: activePrice,
      quantity,
      image: galleryImages[0] || '/images/prod1-primary.jpg',
      size: selectedVariant ? `${selectedVariant.size}${selectedVariant.color ? ` (${selectedVariant.color})` : ''}` : undefined,
    })

    setTimeout(() => {
      setIsAdding(false)
      setShowAddedBanner(true)
    }, 400)
  }

  return (
    <div className="space-y-12">
      {/* Return Navigation */}
      <div className="flex justify-between items-center border-b border-black pb-4">
        <Link
          href="/#collection"
          className="inline-flex items-center gap-2 text-xs uppercase font-mono font-semibold tracking-wider text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#166534]" /> Return to Catalogue
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
          <span className="text-xs uppercase font-mono tracking-wider text-neutral-500 font-semibold">
            {product.category || 'Apparel'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: MULTI-ANGLE MEDIA GALLERY */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Large Display Image */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 border border-neutral-300 group">
            <Image
              src={galleryImages[activeImageIndex] || galleryImages[0]!}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />

            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-2.5 text-black hover:bg-black hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              title="Expand high-resolution view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="absolute top-4 left-4">
              <span className="text-[10px] uppercase tracking-wider bg-black text-white px-2.5 py-1 font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                <span>DROP 01</span>
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
                  className={`relative h-20 w-16 overflow-hidden bg-neutral-100 shrink-0 border transition-all ${
                    activeImageIndex === idx
                      ? 'border-black ring-1 ring-black opacity-100'
                      : 'border-neutral-300 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`Silhouette angle ${idx + 1}`}
                    fill
                    className="object-cover object-center"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: VARIANT SELECTION & COMMERCE ACTIONS */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6 sticky top-28">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.25em] font-mono text-neutral-400 font-semibold block">
              COLLECTION 01
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-black leading-tight tracking-tight">
              {product.title}
            </h1>

            <div className="flex items-baseline gap-4 pt-1">
              <span className="font-mono text-2xl font-bold text-black">
                ${activePrice.toFixed(2)} USD
              </span>
              {selectedVariant?.price_override && (
                <span className="text-xs text-neutral-400 line-through font-mono">
                  ${Number(product.price).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed">
            {product.description}
          </p>

          {/* Fabric Weight & Specification Highlight */}
          {product.material && (
            <div className="p-4 bg-white border border-neutral-300 text-xs font-mono space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-bold">
                FABRIC WEIGHT & SPECIFICATION:
              </span>
              <p className="text-black font-semibold text-xs sm:text-sm">{product.material}</p>
            </div>
          )}

          {/* Variant Sizing Selector */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-xs uppercase font-mono font-bold text-black tracking-wider">
                SELECT GARMENT SIZE:
              </span>
              <span className="text-xs uppercase font-mono text-neutral-500 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-[#166534]" /> Boxy Fit Sizing
              </span>
            </div>

            {variants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                          ? 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-40 line-through'
                          : isSelected
                            ? 'border-black bg-black text-white shadow-md'
                            : 'border-neutral-300 bg-white hover:border-black text-black'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-mono font-bold ${isSelected ? 'text-[#166534]' : ''}`}>
                          {v.size}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#166534] stroke-[3]" />}
                      </div>
                      <div className="mt-1 flex justify-between items-baseline text-[10px] uppercase font-mono opacity-80">
                        <span>{v.color || 'Onyx'}</span>
                        <span className={isLow ? 'text-[#166534] font-bold' : isSoldOut ? 'text-rose-500' : ''}>
                          {isSoldOut ? 'Sold Out' : `${v.stock} left`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 border border-neutral-300 bg-white text-xs font-mono text-neutral-800">
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

          {/* Add to Bag and Checkout Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleAddToCart}
              size="xl"
              disabled={isOutOfStock}
              isLoading={isAdding}
              className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold tracking-[0.2em] uppercase text-xs rounded-none border border-black shadow-md flex items-center justify-center gap-3 group"
            >
              {isOutOfStock ? (
                'CURRENTLY SOLD OUT'
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 text-[#166534]" />
                  <span>ADD TO SHOPPING BAG</span>
                </>
              )}
            </Button>

            {/* Direct Checkout Button */}
            <Link href="/cart" className="block">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 border-2 border-neutral-300 hover:border-black text-black font-mono font-bold text-xs uppercase tracking-wider rounded-none"
              >
                VIEW BAG & CHECKOUT →
              </Button>
            </Link>
          </div>

          {/* Added to Bag Feedback Notification */}
          <AnimatePresence>
            {showAddedBanner && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-black text-white border border-black text-xs space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono uppercase tracking-wider text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#166534]" /> Added to Shopping Bag
                  </span>
                  <button onClick={() => setShowAddedBanner(false)} className="text-neutral-400 hover:text-white font-mono text-sm">
                    ×
                  </button>
                </div>
                <p className="text-xs font-mono text-neutral-300">
                  {product.title} {selectedVariant ? `(Size ${selectedVariant.size})` : ''} has been added to your bag.
                </p>
                <Link
                  href="/cart"
                  className="inline-block text-xs uppercase font-mono font-bold text-[#166534] hover:text-white underline underline-offset-4 pt-1 transition-colors"
                >
                  View Shopping Bag →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Creator Apparel Commitments */}
          <div className="pt-4 border-t border-neutral-200 space-y-2.5 text-xs font-mono text-neutral-600">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#166534]" />
              <span>Complimentary worldwide insured dispatch on all orders.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#166534]" />
              <span>14-day hassle-free returns and size exchanges on unworn garments.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#166534]" />
              <span>100% natural organic cotton & Japanese raw selvedge denim.</span>
            </div>
          </div>
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
              alt="High resolution zoom"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
