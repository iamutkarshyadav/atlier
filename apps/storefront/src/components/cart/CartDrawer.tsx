'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { useHydratedCart } from '@/store/useCartStore'
import { useHydratedBolt } from '@/store/useBoltStore'
import { ProductImage } from '@/components/ui/ProductImage'
import { CartProgressBars } from '@/components/cart/CartProgressBars'
import { PriceDetailsBox } from '@/components/cart/PriceDetailsBox'

export function CartDrawer() {
  const pathname = usePathname()
  const router = useRouter()

  const {
    items,
    isHydrated,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    subtotal,
    discount,
    discountedSubtotal,
    tax,
    shippingFee,
    estimatedTotal,
    qualifiesForFreeShipping,
    standardShippingFee,
    boltHoldFee,
    appliedCouponCode,
    itemCount,
    deliveryMode,
    isOverBoltLimit,
  } = useHydratedCart()

  const { isServiceable } = useHydratedBolt()

  useEffect(() => {
    if (!isDrawerOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, closeDrawer])

  // Keep checkout distraction-free and avoid rendering during SSR pre-hydration
  if (!isHydrated || !isDrawerOpen || pathname?.startsWith('/checkout')) {
    return null
  }

  const isBoltSelected = deliveryMode === 'try_on' && isServiceable

  const handleCheckout = () => {
    if (isOverBoltLimit) return
    closeDrawer()
    router.push('/checkout')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex justify-end font-sans text-[#14293a]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
      onClick={closeDrawer}
    >
      <aside
        className="w-full max-w-md h-full bg-white border-l border-[#d3d6db] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#14293a]" strokeWidth={1.75} />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
              Shopping Bag ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close shopping bag"
            className="p-1.5 text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto border border-[#d3d6db] bg-[#f8f8f8] rounded-full flex items-center justify-center text-[#14293a]">
                <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#14293a]">Your Bag is Empty</p>
                <p className="text-xs text-[#6c7079] max-w-xs mx-auto">
                  Explore tailored pieces with complimentary express shipping above ₹1,999.
                </p>
              </div>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
              >
                <span>Shop New Arrivals</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Link>
            </div>
          ) : (
            <>
              <CartProgressBars
                subtotal={subtotal}
                itemCount={itemCount}
                deliveryMode={deliveryMode}
                isBoltServiceable={isServiceable}
                compact
              />

              {isOverBoltLimit && (
                <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-sm text-xs text-[#b91c1c] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span>
                    Bolt Try-On accommodates up to 5 pieces ({itemCount}/5 selected). Remove an item or switch to Standard Delivery in your bag.
                  </span>
                </div>
              )}

              {/* Bag Items */}
              <div className="divide-y divide-[#e5e7eb] border border-[#e5e7eb] rounded-sm bg-white">
                {items.map((item) => (
                  <div key={item.id} className="p-3.5 flex gap-3.5 items-start">
                    <Link
                      href={`/product/${item.productId}`}
                      onClick={closeDrawer}
                      className="relative w-16 aspect-[3/4] bg-[#f5f5f4] border border-[#e5e7eb] rounded-sm overflow-hidden shrink-0"
                    >
                      <ProductImage
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="64px"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.productId}`}
                          onClick={closeDrawer}
                          className="text-xs font-bold text-[#14293a] hover:text-[#b91c1c] transition-colors line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.title}`}
                          className="text-[#8a909a] hover:text-[#b91c1c] p-0.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6c7079]">
                        {item.size && <span>Size: <strong className="text-[#14293a]">{item.size}</strong></span>}
                        {item.color && <span>· {item.color}</span>}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {/* Inline Qty Stepper */}
                        <div className="inline-flex items-center border border-[#d3d6db] rounded-sm bg-[#f8f8f8]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            aria-label="Decrease quantity"
                            className="p-1.5 text-[#14293a] hover:bg-[#e5e7eb] transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" strokeWidth={1.75} />
                          </button>
                          <span className="px-2.5 text-xs font-bold tabular-nums text-[#14293a]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            aria-label="Increase quantity"
                            className="p-1.5 text-[#14293a] hover:bg-[#e5e7eb] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" strokeWidth={1.75} />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-[#14293a] tabular-nums block">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-[10px] text-[#8a909a] line-through tabular-nums block">
                              ₹{(item.originalPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <PriceDetailsBox
                items={items}
                subtotal={subtotal}
                discount={discount}
                discountedSubtotal={discountedSubtotal}
                tax={tax}
                shippingFee={shippingFee}
                estimatedTotal={estimatedTotal}
                isBoltSelected={isBoltSelected}
                appliedCouponCode={appliedCouponCode}
                qualifiesForFreeShipping={qualifiesForFreeShipping}
                standardShippingFee={standardShippingFee}
                boltHoldFee={boltHoldFee}
                compact
              />
            </>
          )}
        </div>

        {/* Sticky Footer CTAs */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[#e5e7eb] bg-white space-y-2 shrink-0">
            <button
              type="button"
              disabled={isOverBoltLimit}
              onClick={handleCheckout}
              className="w-full py-3 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>
                Proceed to Checkout · ₹
                {Math.round(isBoltSelected ? shippingFee : estimatedTotal).toLocaleString('en-IN')}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="w-full py-2.5 border border-[#d3d6db] hover:border-[#14293a] bg-white text-[#14293a] text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center transition-colors"
            >
              View Full Bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
