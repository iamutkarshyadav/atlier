'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Trash2, ShoppingBag, Truck, Zap, ShieldCheck } from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { useHydratedCart } from '../../store/useCartStore'

export default function LuxuryCartPage() {
  const router = useRouter()
  const {
    items,
    isHydrated,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    tax,
    shippingFee,
    estimatedTotal,
    deliveryMode,
    setDeliveryMode,
  } = useHydratedCart()

  const [isCheckingAuth, setIsCheckingAuth] = useState(false)

  const handleProceedToCheckout = async () => {
    setIsCheckingAuth(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

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

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-24 text-center">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-mono">
          Loading Bag Items...
        </span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 space-y-10 sm:space-y-12">
      {/* Editorial Header */}
      <div className="border-b border-black pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold">
              COLLECTION 01
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
            <span className="text-xs uppercase tracking-[0.2em] text-[#166534] font-mono font-semibold">
              ORDER REVIEW
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-black leading-tight">
            SHOPPING <span className="text-[#166534] font-serif italic font-normal lowercase">bag</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs uppercase font-mono tracking-wider text-neutral-400 hover:text-red-700 transition-colors"
            >
              Clear Entire Bag
            </button>
          )}
          <Link
            href="/#collection"
            className="text-xs uppercase font-mono font-semibold tracking-wider text-neutral-600 hover:text-black transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#166534]" /> Continue Shopping
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        /* Clean Minimalist Apparel Empty State (No blinking lights or astrolabes) */
        <div className="min-h-[460px] flex items-center justify-center py-16 px-4 border border-neutral-200 bg-white">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
              <ShoppingBag className="w-7 h-7 text-neutral-800 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] font-mono text-neutral-400 font-semibold block">
                EMPTY BAG
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-black tracking-tight">
                YOUR BAG IS EMPTY
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed max-w-sm mx-auto">
                You have not added any garments to your bag yet. Explore current heavyweight hoodies, tees, and selvedge denim.
              </p>
            </div>

            <div className="pt-2">
              <Link href="/#collection" className="inline-block w-full sm:w-auto">
                <Button
                  size="xl"
                  className="w-full sm:w-auto px-8 h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs tracking-[0.2em] uppercase rounded-none border border-black shadow-md flex items-center justify-center gap-3 group transition-all"
                >
                  <span>SHOP DROP 01</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#166534]" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left Column: Items List & Shipping Selection */}
          <div className="lg:col-span-7 space-y-8 divide-y divide-neutral-200">
            {items.map((item) => (
              <div
                key={item.id}
                className="pt-6 first:pt-0 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center"
              >
                <div className="flex gap-5 items-center">
                  <div className="relative h-28 w-24 overflow-hidden bg-neutral-100 shrink-0 border border-neutral-300">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold">
                        {item.category || 'Apparel'}
                      </span>
                      {item.size && (
                        <span className="text-[10px] uppercase font-mono font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 border border-neutral-300">
                          SIZE: <span className="text-[#166534]">{item.size}</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold uppercase text-black">
                      {item.title}
                    </h2>
                    <p className="font-mono text-sm text-neutral-900 font-bold">
                      ${item.price.toFixed(2)} USD
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-auto">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-neutral-300 text-xs font-mono bg-white">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="px-3 py-1.5 hover:bg-neutral-100 transition-colors font-bold"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-3 py-1.5 font-bold min-w-[28px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="px-3 py-1.5 hover:bg-neutral-100 transition-colors font-bold"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-mono text-sm font-bold text-black min-w-[80px] text-right">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-neutral-400 hover:text-black transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Realistic Apparel Shipping Method Selection */}
            <div className="pt-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-mono font-semibold block">
                  SHIPPING DISPATCH METHOD
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMode('direct')}
                  className={`p-4 text-left border transition-all ${
                    deliveryMode === 'direct'
                      ? 'border-black bg-white ring-1 ring-black shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#166534]" /> Standard Insured
                    </span>
                    <span className="font-mono text-xs font-bold text-black">$15.00</span>
                  </div>
                  <p className="text-xs text-neutral-500 font-light mt-1.5 leading-relaxed">
                    Tracked delivery with protective garment dust bag. Arrives in 3–5 business days.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMode('try_on')}
                  className={`p-4 text-left border transition-all ${
                    deliveryMode === 'try_on'
                      ? 'border-black bg-white ring-1 ring-black shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#166534]" /> Express Priority
                    </span>
                    <span className="font-mono text-xs font-bold text-black">$25.00</span>
                  </div>
                  <p className="text-xs text-neutral-500 font-light mt-1.5 leading-relaxed">
                    Priority dispatch from custom mills with expedited 1–2 business day transit.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8 border border-neutral-300 bg-white space-y-6 sticky top-28 shadow-sm">
              <div className="flex items-center justify-between border-b border-black pb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-mono font-bold">
                  ORDER SUMMARY
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} ITEMS
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>
                    {deliveryMode === 'try_on' ? 'Express Priority Shipping' : 'Standard Insured Shipping'}
                  </span>
                  <span className="font-bold text-black">${shippingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Estimated Tax (8%)</span>
                  <span className="font-bold text-black">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-neutral-200 pt-3 flex justify-between text-base font-bold text-black">
                  <span>Total</span>
                  <span className="text-lg">${estimatedTotal.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleProceedToCheckout}
                size="xl"
                className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs tracking-[0.2em] uppercase rounded-none border border-black shadow-md flex items-center justify-center gap-3 group transition-all"
                isLoading={isCheckingAuth}
              >
                <span>PROCEED TO CHECKOUT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#166534]" />
              </Button>

              {/* Guarantees */}
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-neutral-500 uppercase tracking-wider justify-center">
                <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0" />
                <span>Secure Checkout • 14-Day Free Exchange</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
