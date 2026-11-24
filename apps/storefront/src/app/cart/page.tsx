'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Trash2, ShoppingBag, Truck, Zap, AlertCircle, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { useHydratedCart } from '../../store/useCartStore'
import { useHydratedBolt } from '../../store/useBoltStore'
import { LuxuryTierProgressBar } from '@/components/cart/LuxuryTierProgressBar'
import { ConciergeCouponInput } from '@/components/cart/ConciergeCouponInput'

export default function LuxuryCartPage() {
  const router = useRouter()
  const {
    items,
    isHydrated: isCartHydrated,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discount,
    discountedSubtotal,
    tax,
    shippingFee,
    estimatedTotal,
    tierProgress,
    pricingEvaluation,
    itemCount,
    deliveryMode,
    setDeliveryMode,
  } = useHydratedCart()

  const { isServiceable, city: boltCity, pincode, isHydrated: isBoltHydrated } = useHydratedBolt()

  const [isCheckingAuth, setIsCheckingAuth] = useState(false)

  const isBoltSelected = deliveryMode === 'try_on' && isServiceable
  const isOverBoltLimit = isBoltSelected && itemCount > 5

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
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <span className="text-[#14293a]">Shopping Bag</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
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
          <div className="min-h-[380px] flex items-center justify-center py-16 px-4 border border-[#d3d6db] bg-[#f8f8f8] rounded-sm shadow-xs">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-white border border-[#d3d6db] rounded-full flex items-center justify-center text-[#14293a]">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#14293a]">
                  Your Bag is Currently Empty
                </h2>
                <p className="text-xs text-[#6c7079] leading-relaxed">
                  Discover our permanent collection crafted from heavyweight Japanese raw selvedge denim and 480 GSM French Terry.
                </p>
              </div>
              <Link href="/shop" className="inline-block pt-2">
                <Button
                  size="lg"
                  className="px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors shadow-sm"
                >
                  <span>Explore Collections →</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Bag Items & Delivery Selection */}
            <div className="lg:col-span-8 space-y-6">
              {/* Luxury Tier Milestone Progress Bar */}
              <LuxuryTierProgressBar tierProgress={tierProgress} />

              {/* Bolt Limit Alert */}
              {isOverBoltLimit && (
                <div className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs flex items-start gap-3 rounded-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="block font-bold">
                      Bolt Try-On Limit Exceeded ({itemCount} / 5 pieces)
                    </strong>
                    <p className="text-[11px] leading-relaxed text-[#991b1b]">
                      Doorstep Salon is limited to a maximum of 5 garments per appointment. Please reduce quantities to proceed with Bolt, or select Standard Insured Delivery below.
                    </p>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="border border-[#d3d6db] rounded-sm bg-white divide-y divide-[#e5e7eb] shadow-xs">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-16 overflow-hidden bg-[#f8f8f8] shrink-0 border border-[#d3d6db] rounded-sm">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover object-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#b91c1c] tracking-wider block">
                          {item.category || 'Atelier Garment'}
                        </span>
                        <h3 className="text-sm font-bold text-[#14293a]">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#6c7079]">
                          {item.size ? `Size: ${item.size}` : 'Standard Edition'}
                        </p>
                        <span className="text-xs font-bold text-[#14293a] block">
                          ₹{Number(item.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#e5e7eb]">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-[#d3d6db] bg-[#f8f8f8] text-xs rounded-sm overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-3 py-1.5 hover:bg-[#e5e7eb] text-[#14293a] transition-colors font-bold cursor-pointer"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 font-bold min-w-[28px] text-center text-[#14293a]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3 py-1.5 hover:bg-[#e5e7eb] text-[#14293a] transition-colors font-bold cursor-pointer"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-bold text-[#14293a] min-w-[90px] text-right">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-[#8a909a] hover:text-[#b91c1c] transition-colors cursor-pointer"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Experience Selector */}
              <div className="space-y-3 pt-4">
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
                          ? 'border-[#b91c1c] bg-[#fef2f2] ring-1 ring-[#b91c1c] shadow-xs cursor-pointer'
                          : 'border-[#d3d6db] bg-white hover:border-[#14293a] text-[#14293a] cursor-pointer'
                        : 'border-dashed border-[#d3d6db] bg-[#f8f8f8] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
                        <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" />
                        <span>Bolt Try-On Service</span>
                      </span>
                      <span className="text-xs font-bold text-[#b91c1c]">₹99.00 Hold</span>
                    </div>
                    <p className="text-xs text-[#6c7079] mt-1.5 leading-relaxed">
                      {isServiceable
                        ? `Available in ${boltCity || 'your area'} (PIN: ${pincode}). Try up to 5 pieces at home before paying.`
                        : 'Enter your PIN above to check Bolt doorstep try-on eligibility.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode('direct')}
                    className={`p-4 text-left border rounded-sm transition-all cursor-pointer ${
                      deliveryMode === 'direct'
                        ? 'border-[#14293a] bg-[#f8f8f8] ring-1 ring-[#14293a] shadow-xs'
                        : 'border-[#d3d6db] bg-white hover:border-[#14293a] text-[#14293a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#14293a]" />
                        <span>Standard Delivery</span>
                      </span>
                      <span className="text-xs font-bold text-[#14293a]">₹150.00</span>
                    </div>
                    <p className="text-xs text-[#6c7079] mt-1.5 leading-relaxed">
                      Tracked insured courier delivery across India in 2–4 business days. Direct payment upfront.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary Card */}
            <div className="lg:col-span-4 space-y-4">
              {/* Concierge VIP Invitation Code Entry */}
              <ConciergeCouponInput />

              <div className="p-6 border border-[#d3d6db] bg-[#f8f8f8] space-y-5 sticky top-28 shadow-sm rounded-sm">
                <div className="flex items-center justify-between border-b border-[#d3d6db] pb-3">
                  <span className="text-xs uppercase tracking-wider font-bold text-[#14293a]">
                    ORDER SUMMARY
                  </span>
                  <span className="text-xs text-[#6c7079]">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    {isBoltSelected && ' (max 5)'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#6c7079]">
                    <span>Garments Subtotal</span>
                    <span className="font-bold text-[#14293a]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 bg-emerald-50 px-2 py-1.5 border border-emerald-200 rounded text-xs">
                      <span className="font-medium">Private Client Privilege</span>
                      <span className="font-bold font-mono">-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {isBoltSelected ? (
                    <>
                      <div className="flex justify-between text-[#b91c1c] bg-[#fef2f2] p-2.5 border border-[#fecaca] rounded-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3.5 h-3.5" />
                          Payable after Try-On:
                        </span>
                        <span className="font-bold">₹{discountedSubtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[#6c7079]">
                        <span>Bolt Convenience Hold</span>
                        <span className="font-bold tabular-nums text-[#14293a]">
                          {shippingFee === 0 ? '₹0.00 (Waived)' : `₹${shippingFee}`}
                        </span>
                      </div>
                      <div className="border-t border-[#d3d6db] pt-3 flex justify-between text-base font-bold text-[#14293a]">
                        <span>Immediate Hold Due</span>
                        <span className="text-lg tabular-nums text-[#b91c1c]">₹{shippingFee}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[#6c7079]">
                        <span>Estimated Shipping</span>
                        <span className="font-bold tabular-nums text-[#14293a]">
                          {shippingFee === 0 ? 'COMPLIMENTARY' : `₹${shippingFee}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#6c7079]">
                        <span>GST Tax (12%)</span>
                        <span className="font-bold tabular-nums text-[#14293a]">₹{Math.round(tax).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t border-[#d3d6db] pt-3 flex justify-between text-base font-bold text-[#14293a]">
                        <span>Total Due Now</span>
                        <span className="text-lg tabular-nums">
                          ₹{Math.round(estimatedTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Checkout CTA */}
                <Button
                  onClick={handleProceedToCheckout}
                  disabled={isOverBoltLimit}
                  size="xl"
                  className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs tracking-wider uppercase rounded-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  isLoading={isCheckingAuth}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
