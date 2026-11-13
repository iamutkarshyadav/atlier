'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Trash2, ShoppingBag, Truck, Zap, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { useHydratedCart } from '../../store/useCartStore'
import { useHydratedBolt } from '../../store/useBoltStore'

export default function LuxuryCartPage() {
  const router = useRouter()
  const {
    items,
    isHydrated: isCartHydrated,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    tax,
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
      <div className="min-h-screen bg-[#212121] flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#B91C1C] rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-mono">
          Loading Bag Items...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 space-y-10 sm:space-y-12">
        {/* Editorial Header */}
        <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold">
                COLLECTION 01
              </span>
              <span className="w-1.5 h-1.5 bg-[#B91C1C]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[#B91C1C] font-mono font-semibold">
                BAG REVIEW
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-white leading-tight font-display">
              SHOPPING <span className="text-[#B91C1C]">BAG</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs uppercase font-mono tracking-wider text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Clear Entire Bag
              </button>
            )}
            <Link
              href="/#collection"
              className="text-xs uppercase font-mono font-semibold tracking-wider text-neutral-300 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#B91C1C]" /> Continue Shopping
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="min-h-[460px] flex items-center justify-center py-16 px-4 border border-white/10 bg-[#262629] rounded-none shadow-xl">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-[#1A1B1D] border border-white/10 rounded-none flex items-center justify-center text-white">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase tracking-tight text-white font-mono">
                  Your Bag is Currently Empty
                </h2>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  Explore our limited-run silhouettes, crafted from custom heavyweight French Terry and raw Japanese selvedge.
                </p>
              </div>
              <Link href="/#collection" className="inline-block pt-2">
                <Button
                  size="lg"
                  style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                  className="btn-dark px-8 h-12 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-neutral-800 dark:border-white/15 cursor-pointer shadow-lg transition-all"
                >
                  <span style={{ color: '#ffffff' }}>EXPLORE COLLECTION →</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            {/* Left Column: Bag Line Items & Shipping Mode Toggle */}
            <div className="lg:col-span-7 space-y-6">
              {/* Limit Warning when over 5 items in Bolt */}
              {isOverBoltLimit && (
                <div className="p-4 bg-red-950/40 border border-[#B91C1C]/40 text-red-200 text-xs font-mono flex items-start gap-3 rounded-none">
                  <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold uppercase tracking-wider text-white">
                      Bolt ⚡ Try-On Limit Exceeded ({itemCount} / 5 pieces)
                    </strong>
                    <p className="text-[11px] leading-relaxed text-neutral-300">
                      Doorstep Salon is limited to a maximum of 5 garments per appointment. Please reduce quantities to proceed with Bolt ⚡, or select Standard Insured Delivery below.
                    </p>
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-5 border border-white/10 bg-[#262629] rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-colors hover:border-white/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-16 overflow-hidden bg-[#1A1B1D] shrink-0 border border-white/10 rounded-none">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover object-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold uppercase text-white font-mono">
                        {item.title}
                      </h3>
                      <p className="text-xs font-mono text-neutral-400">
                        {item.size ? `Size: ${item.size}` : 'Standard Edition'}
                      </p>
                      <span className="font-mono text-xs font-bold text-[#B91C1C] block">
                        ₹{Number(item.price).toLocaleString('en-IN')} INR
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-white/10">
                    <div className="flex items-center border border-white/15 bg-[#1A1B1D] text-xs font-mono rounded-none overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-3 py-1.5 hover:bg-[#38393D] text-neutral-300 hover:text-white transition-colors font-bold cursor-pointer"
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-3 py-1.5 font-bold min-w-[28px] text-center text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-3 py-1.5 hover:bg-[#38393D] text-neutral-300 hover:text-white transition-colors font-bold cursor-pointer"
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono text-sm font-bold text-white min-w-[90px] text-right">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Experience Options */}
              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-mono font-semibold block">
                    DELIVERY EXPERIENCE
                  </span>
                  <span className="w-1.5 h-1.5 bg-[#B91C1C]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isServiceable) setDeliveryMode('try_on')
                    }}
                    className={`p-4 text-left border rounded-none transition-all ${
                      isServiceable
                        ? deliveryMode === 'try_on'
                          ? 'border-[#B91C1C] bg-[#1A1B1D] ring-1 ring-[#B91C1C] shadow-lg cursor-pointer'
                          : 'border-white/10 bg-[#262629] hover:border-white/20 text-neutral-300 cursor-pointer'
                        : 'border-dashed border-white/10 bg-[#1A1B1D]/40 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 fill-amber-400 text-amber-400" /> Bolt ⚡ Try-On Salon
                      </span>
                      <span className="font-mono text-xs font-bold text-white">₹99.00</span>
                    </div>
                    <p className="text-xs text-neutral-400 font-light mt-1.5 leading-relaxed">
                      {isServiceable
                        ? `Available in ${boltCity || 'your area'} (PIN: ${pincode}). Try up to 5 pieces at home before paying.`
                        : 'Check your PIN in the top banner to check Bolt ⚡ doorstep salon eligibility.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode('direct')}
                    className={`p-4 text-left border rounded-none transition-all cursor-pointer ${
                      deliveryMode === 'direct'
                        ? 'border-[#B91C1C] bg-[#1A1B1D] ring-1 ring-[#B91C1C] shadow-lg'
                        : 'border-white/10 bg-[#262629] hover:border-white/20 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#B91C1C]" /> Standard Delivery
                      </span>
                      <span className="font-mono text-xs font-bold text-white">₹150.00</span>
                    </div>
                    <p className="text-xs text-neutral-400 font-light mt-1.5 leading-relaxed">
                      Tracked courier delivery to all Indian postal codes in 3–5 business days. Full payment upfront.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary Card */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 border border-white/10 bg-[#1A1B1D] space-y-6 sticky top-28 shadow-xl rounded-none">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-mono font-bold">
                    ORDER SUMMARY
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {itemCount} {itemCount === 1 ? 'PIECE' : 'PIECES'}
                    {isBoltSelected && ' (MAX 5)'}
                  </span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between text-neutral-400">
                    <span>Garments Subtotal</span>
                    <span className="font-bold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {isBoltSelected ? (
                    <>
                      <div className="flex justify-between text-amber-300 bg-amber-950/30 p-2.5 border border-amber-500/20 rounded-none">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Payable after Doorstep Try-On:
                        </span>
                        <span className="font-bold font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Bolt Convenience Booking Fee</span>
                        <span className="font-bold text-white">₹99.00</span>
                      </div>
                      <div className="border-t border-white/10 pt-3 flex justify-between text-base font-bold text-white">
                        <span>Immediate Checkout Due</span>
                        <span className="text-lg font-mono text-white">₹99.00 INR</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-neutral-400">
                        <span>Standard Shipping Fee</span>
                        <span className="font-bold text-white">₹150.00</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Estimated Tax (8%)</span>
                        <span className="font-bold text-white">₹{tax.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-white/10 pt-3 flex justify-between text-base font-bold text-white">
                        <span>Total Due Now</span>
                        <span className="text-lg font-mono text-white">
                          ₹{(subtotal + 150.0 + tax).toFixed(2)} INR
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleProceedToCheckout}
                  disabled={isOverBoltLimit}
                  size="xl"
                  className="w-full h-14 bg-[#38393D] hover:bg-[#4A4B50] text-white font-mono font-bold text-xs tracking-[0.2em] uppercase rounded-none border border-white/15 shadow-xl flex items-center justify-center gap-3 group transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  isLoading={isCheckingAuth}
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <span className="w-1.5 h-1.5 rounded-none bg-[#B91C1C]" />
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#B91C1C]" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
