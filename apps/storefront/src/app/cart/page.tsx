'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Trash2,
  ShoppingBag,
  Truck,
  Zap,
  AlertCircle,
  Heart,
  Minus,
  Plus,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { DEFAULT_PRODUCTS, sortSizes, type Product } from '@repo/supabase/utils'
import { useHydratedCart } from '../../store/useCartStore'
import { useHydratedBolt } from '../../store/useBoltStore'
import { useHydratedWishlist } from '../../store/useWishlistStore'
import { LuxuryTierProgressBar } from '@/components/cart/LuxuryTierProgressBar'
import { CartProgressBars } from '@/components/cart/CartProgressBars'
import { ConciergeCouponInput } from '@/components/cart/ConciergeCouponInput'
import { PriceDetailsBox } from '@/components/cart/PriceDetailsBox'
import { ProductImage } from '@/components/ui/ProductImage'

function resolveSizeOptionsForItem(currentSize?: string, category?: string): string[] {
  const cleanCurrent = currentSize?.trim()
  const isNumeric =
    (cleanCurrent && /^\d+$/.test(cleanCurrent)) ||
    category?.toLowerCase().includes('denim') ||
    category?.toLowerCase().includes('pant') ||
    category?.toLowerCase().includes('trouser')

  const base = isNumeric ? ['28', '30', '32', '34', '36'] : ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  if (cleanCurrent && !base.includes(cleanCurrent)) {
    return sortSizes([...base, cleanCurrent])
  }
  return sortSizes(base)
}

export default function LuxuryCartPage() {
  const router = useRouter()
  const {
    items,
    isHydrated: isCartHydrated,
    updateQuantity,
    updateItemSize,
    removeItem,
    clearCart,
    recalculatePromotions,
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
    tierProgress,
    itemCount,
    deliveryMode,
    setDeliveryMode,
  } = useHydratedCart()

  const { isServiceable, city: boltCity, pincode, isHydrated: isBoltHydrated } = useHydratedBolt()
  const { isWishlisted, toggleWishlist } = useHydratedWishlist()

  const [isCheckingAuth, setIsCheckingAuth] = useState(false)

  useEffect(() => {
    if (isCartHydrated && items.length > 0) {
      recalculatePromotions()
    }
    // Only re-sync pricing evaluation on initial hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartHydrated])

  const isBoltSelected = deliveryMode === 'try_on' && isServiceable
  const isOverBoltLimit = isBoltSelected && itemCount > 5

  const handleMoveToWishlist = async (item: (typeof items)[number]) => {
    if (!isWishlisted(item.productId)) {
      const baseProduct =
        DEFAULT_PRODUCTS.find((p) => p.id === item.productId) ||
        ({
          id: item.productId,
          title: item.title,
          description: null,
          price: item.price,
          stock: 10,
          image_url: item.image,
          category_id: null,
          category: item.category,
          material: null,
          edition: item.edition,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Product)
      await toggleWishlist(baseProduct)
    }
    removeItem(item.id)
  }

  const handleProceedToCheckout = async () => {
    if (isOverBoltLimit) return
    setIsCheckingAuth(true)
    try {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login?callbackUrl=/checkout')
      } else {
        router.push('/checkout')
      }
    } catch {
      router.push('/login?callbackUrl=/checkout')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  if (!isCartHydrated || !isBoltHydrated) {
    return (
      <div className="min-h-screen bg-white text-[#14293a] flex flex-col items-center justify-center px-6 py-24 text-center font-sans">
        <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider text-[#6c7079] font-medium">
          Loading Bag Items...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] font-sans pb-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <span className="text-[#14293a]">Shopping Bag</span>
        </nav>

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              Shopping Bag
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Standard delivery &amp; 45-min doorstep try-on available</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[#6c7079] hover:text-[#b91c1c] transition-colors cursor-pointer underline underline-offset-2"
              >
                Clear Bag
              </button>
            )}
            <Link
              href="/shop"
              className="text-[#14293a] hover:text-[#b91c1c] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              Continue Shopping &rarr;
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="min-h-[380px] flex items-center justify-center py-16 px-4 border border-[#d3d6db] bg-[#f8f8f8] rounded-sm">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-white border border-[#d3d6db] rounded-full flex items-center justify-center text-[#14293a]">
                <ShoppingBag className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#14293a]">Your Bag is Currently Empty</h2>
                <p className="text-xs text-[#6c7079] leading-relaxed">
                  Discover our permanent collection crafted from heavyweight organic cotton and fine natural weaves.
                </p>
              </div>
              <Link href="/shop" className="inline-block pt-2">
                <Button
                  size="lg"
                  className="px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
                >
                  <span>Explore Collections</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.75} />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Progress Bars, Bag Items & Delivery Selection */}
            <div className="lg:col-span-8 space-y-6">
              <CartProgressBars
                subtotal={subtotal}
                itemCount={itemCount}
                deliveryMode={deliveryMode}
                isBoltServiceable={isServiceable}
              />

              <LuxuryTierProgressBar tierProgress={tierProgress} />

              {isOverBoltLimit && (
                <div className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs flex items-start gap-3 rounded-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="space-y-0.5">
                    <strong className="block font-bold">
                      Bolt Try-On Limit Exceeded ({itemCount} / 5 pieces)
                    </strong>
                    <p className="text-[11px] leading-relaxed text-[#991b1b]">
                      Doorstep Salon is limited to a maximum of 5 garments per appointment. Please reduce quantities to proceed with Bolt, or select Standard Delivery below.
                    </p>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="border border-[#d3d6db] rounded-sm bg-white divide-y divide-[#e5e7eb]">
                {items.map((item) => {
                  const sizeOptions = resolveSizeOptionsForItem(item.size, item.category)

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <Link
                          href={`/product/${item.productId}`}
                          className="relative w-18 aspect-[3/4] overflow-hidden bg-[#f5f5f4] shrink-0 border border-[#d3d6db] rounded-sm"
                        >
                          <ProductImage
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="72px"
                          />
                        </Link>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <Link
                            href={`/product/${item.productId}`}
                            className="text-sm font-bold text-[#14293a] hover:text-[#b91c1c] transition-colors block truncate"
                          >
                            {item.title}
                          </Link>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#52565e]">
                            <label className="inline-flex items-center gap-1.5">
                              <span className="text-[11px] uppercase tracking-wider text-[#6c7079] font-semibold">
                                Size:
                              </span>
                              <select
                                aria-label={`Select size for ${item.title}`}
                                value={item.size || sizeOptions[0]}
                                onChange={(e) => updateItemSize(item.id, e.target.value)}
                                className="border border-[#d3d6db] bg-white px-2 py-0.5 text-xs font-semibold text-[#14293a] rounded-sm focus:outline-none focus:border-[#14293a] cursor-pointer"
                              >
                                {sizeOptions.map((sz) => (
                                  <option key={sz} value={sz}>
                                    {sz}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {item.color && (
                              <span className="text-[11px] text-[#6c7079]">
                                Color: <strong className="text-[#14293a]">{item.color}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1.5 pt-0.5">
                            <span className="text-xs font-bold text-[#14293a] tabular-nums">
                              ₹{Number(item.price).toLocaleString('en-IN')}
                            </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <>
                                <span className="text-[11px] text-[#8a909a] line-through tabular-nums">
                                  ₹{Number(item.originalPrice).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-bold text-[#b91c1c] tracking-tight">
                                  ({Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF)
                                </span>
                              </>
                            )}
                          </div>

                          <div className="pt-1 flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => handleMoveToWishlist(item)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#52565e] hover:text-[#14293a] transition-colors cursor-pointer"
                            >
                              <Heart className="w-3 h-3" strokeWidth={1.75} />
                              <span>Move to Wishlist</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6c7079] hover:text-[#b91c1c] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#e5e7eb] shrink-0">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-[#d3d6db] bg-[#f8f8f8] text-xs rounded-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 hover:bg-[#e5e7eb] text-[#14293a] transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" strokeWidth={1.75} />
                          </button>
                          <span className="px-3 py-1 font-bold min-w-[28px] text-center text-[#14293a] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-2 hover:bg-[#e5e7eb] text-[#14293a] transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" strokeWidth={1.75} />
                          </button>
                        </div>

                        <div className="text-right min-w-[90px]">
                          <span className="text-sm font-bold text-[#14293a] block tabular-nums">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-[11px] text-[#8a909a] line-through block tabular-nums">
                              ₹{(item.originalPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Delivery Experience Selector */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                  SELECT DELIVERY METHOD
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isServiceable) setDeliveryMode('try_on')
                    }}
                    className={`p-4 text-left border rounded-sm transition-all ${
                      isServiceable
                        ? deliveryMode === 'try_on'
                          ? 'border-[#b91c1c] bg-[#fef2f2] ring-1 ring-[#b91c1c] cursor-pointer'
                          : 'border-[#d3d6db] bg-white hover:border-[#14293a] text-[#14293a] cursor-pointer'
                        : 'border-dashed border-[#d3d6db] bg-[#f8f8f8] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" strokeWidth={1.75} />
                        <span>Bolt Try-On Service</span>
                      </span>
                      <span className="text-xs font-bold text-[#b91c1c]">₹{boltHoldFee} Hold</span>
                    </div>
                    <p className="text-xs text-[#6c7079] mt-1.5 leading-relaxed">
                      {isServiceable
                        ? `Available in ${boltCity || 'your area'} (PIN: ${pincode}). Try up to 5 pieces at home; ₹${boltHoldFee} hold is credited toward kept items.`
                        : 'Set a serviceable PIN in the header to unlock 45-min doorstep try-on.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode('direct')}
                    className={`p-4 text-left border rounded-sm transition-all cursor-pointer ${
                      deliveryMode === 'direct'
                        ? 'border-[#14293a] bg-[#f8f8f8] ring-1 ring-[#14293a]'
                        : 'border-[#d3d6db] bg-white hover:border-[#14293a] text-[#14293a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#14293a]" strokeWidth={1.75} />
                        <span>Standard Delivery</span>
                      </span>
                      <span className="text-xs font-bold tabular-nums">
                        {qualifiesForFreeShipping ? (
                          <>
                            <span className="line-through text-neutral-400 mr-1.5 font-normal">
                              ₹{standardShippingFee}
                            </span>
                            <span className="text-emerald-700">FREE</span>
                          </>
                        ) : (
                          <span className="text-[#14293a]">₹{standardShippingFee}</span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-[#6c7079] mt-1.5 leading-relaxed">
                      Tracked insured courier delivery across India in 2–4 business days.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Coupon & Itemized Order Summary */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
              <ConciergeCouponInput />

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
              />

              <Button
                onClick={handleProceedToCheckout}
                disabled={isOverBoltLimit}
                size="xl"
                className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs tracking-wider uppercase rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                isLoading={isCheckingAuth}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
