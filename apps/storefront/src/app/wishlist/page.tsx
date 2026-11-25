'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Heart, ShoppingBag, Trash2, ArrowRight, Check } from 'lucide-react'
import { useHydratedWishlist } from '../../store/useWishlistStore'
import { useCartStore } from '../../store/useCartStore'
import { ProductCard } from '../../components/ProductCard'
import type { Product } from '@repo/supabase/utils'

export default function WishlistPage() {
  const { items, itemCount, isHydrated, removeItem, clearWishlist } = useHydratedWishlist()
  const addItem = useCartStore((s) => s.addItem)

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  const handleMoveToCart = (product: Product, size = 'M') => {
    setMovingId(product.id)

    const isPants =
      product.category?.toLowerCase().includes('pant') ||
      product.category?.toLowerCase().includes('denim')
    const effectiveSize = isPants ? '32' : size

    const prodPrice = Number(product.price)
    const originalPrice =
      Number((product as any).compare_at_price) > prodPrice
        ? Number((product as any).compare_at_price)
        : undefined

    addItem({
      id: `${product.id}-${effectiveSize}`,
      productId: product.id,
      title: product.title,
      category: product.category || 'Atelier Collection',
      edition: 'Permanent Collection',
      price: prodPrice,
      originalPrice,
      quantity: 1,
      image: product.image_url || '',
      size: effectiveSize,
    })

    removeItem(product.id)
    setMovingId(null)
    setToastMessage(`Moved ${product.title} to your Cart`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleRemove = (productId: string, title: string) => {
    removeItem(productId)
    setToastMessage(`Removed ${title} from Wishlist`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div className="bg-white min-h-screen text-[#14293a] font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#14293a] text-white px-4 py-3 rounded-sm shadow-xl flex items-center gap-2 text-xs font-sans animate-slideUp">
          <Check className="w-4 h-4 text-[#059669]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">
            Home
          </Link>
          <span> / </span>
          <span className="text-[#14293a]">Wishlist</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              My Wishlist
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </h1>
            <p className="text-xs text-[#6c7079] mt-1">
              Save your favorite garments here to buy later or move them directly to your cart.
            </p>
          </div>

          {itemCount > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearWishlist}
                className="text-xs font-medium text-[#6c7079] hover:text-[#b91c1c] transition-colors cursor-pointer"
              >
                Clear Wishlist
              </button>
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#14293a] hover:text-[#b91c1c] transition-colors"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Content Body */}
        {!isHydrated ? (
          <div className="py-16 text-center text-xs text-[#6c7079]">
            Loading your wishlist...
          </div>
        ) : itemCount === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto my-12 p-8 border border-[#d3d6db] rounded-sm text-center bg-[#f8f8f8]">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-[#d3d6db] flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#6c7079]" />
            </div>
            <h2 className="text-base font-bold text-[#14293a] mb-1">Your wishlist is empty</h2>
            <p className="text-xs text-[#6c7079] mb-6">
              Explore our new arrivals and tap the heart icon on any product to save it to your wishlist.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center h-10 px-6 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-wider"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          /* Populated Wishlist Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((product, idx) => (
              <div
                key={product.id}
                className="flex flex-col justify-between bg-white border border-[#e5e7eb] rounded-sm p-3 hover:shadow-md transition-shadow duration-200"
              >
                <ProductCard
                  product={product}
                  priority={idx < 4}
                  showTryOnBadge={true}
                  showReassuranceLine={false}
                  onQuickAdd={(p, sz) => handleMoveToCart(p, sz)}
                />

                {/* Dedicated Wishlist Move to Cart Action */}
                <div className="mt-3 pt-2.5 border-t border-[#e5e7eb] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(product)}
                    disabled={movingId === product.id}
                    className="flex-1 h-8 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-sm transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Move to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(product.id, product.title)}
                    className="h-8 px-2.5 text-xs text-[#6c7079] hover:text-[#b91c1c] hover:bg-[#fef2f2] border border-[#d3d6db] rounded-sm transition-colors cursor-pointer flex items-center justify-center"
                    title="Remove from wishlist"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
