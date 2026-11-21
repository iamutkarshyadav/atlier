'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { useHydratedBolt } from '../store/useBoltStore'

export function BoltPromotionBanner() {
  const { pincode, city, isServiceable, setPincode, clearPincode, isHydrated } = useHydratedBolt()
  const [inputPin, setInputPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isChanging, setIsChanging] = useState(false)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputPin.trim()
    if (!trimmed || trimmed.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit postal code.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.serviceable) {
        setPincode(trimmed, true, data.city)
        setSuccessMsg(`PIN ${trimmed} is serviceable for 45-Min Doorstep Fitting${data.city ? ` in ${data.city}` : ''}!`)
        setIsChanging(false)
        setInputPin('')
      } else {
        setPincode(trimmed, false, null)
        setErrorMsg(
          data.message ||
            `PIN ${trimmed} is currently outside our 45-minute rapid salon radius. Standard express shipping is available!`
        )
      }
    } catch {
      setErrorMsg('Failed to check postal code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    clearPincode()
    setIsChanging(true)
    setInputPin('')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  return (
    <section className="bg-[#f8f8f8] border-y border-[#d3d6db] py-16 sm:py-20 font-sans text-[#14293a]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-bold uppercase tracking-wider rounded-sm">
            <Zap className="w-3.5 h-3.5 fill-[#b91c1c]" />
            <span>Bolt Doorstep Try-On</span>
          </div>

          <h2 className="font-sans text-2xl sm:text-4xl font-bold tracking-tight text-[#14293a]">
            The Fitting Salon Comes to Your Mirror
          </h2>

          <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
            Never guess sizes or wait for returns. Choose up to 5 silhouettes. A uniformed private logistics officer arrives at your doorstep with your garment tote for 45 private minutes in front of your own mirror.
          </p>
        </div>

        {/* 3 Step Visual Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-neutral-200/80 hover:border-[#14293a] p-6 sm:p-7 rounded-xs shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-[#fef2f2] border border-red-100 flex items-center justify-center text-[#b91c1c] font-bold text-xs">
                  01
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079]">
                  Step One
                </span>
              </div>
              <h3 className="font-sans text-lg font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors">
                Select Up to 5 Items
              </h3>
              <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed font-sans">
                Curate any apparel silhouettes from our catalog. You can pick multiple sizes (e.g. M and L) without paying upfront for all pieces.
              </p>
            </div>
            <div className="pt-3 border-t border-neutral-100 text-[11px] font-bold text-[#b91c1c] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Zero Risk Reservation</span>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 hover:border-[#14293a] p-6 sm:p-7 rounded-xs shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-[#fef2f2] border border-red-100 flex items-center justify-center text-[#b91c1c] font-bold text-xs">
                  02
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079]">
                  Step Two
                </span>
              </div>
              <h3 className="font-sans text-lg font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors">
                45-Minute In-Home Fitting
              </h3>
              <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed font-sans">
                A uniformed private courier arrives during your reserved window. Take 45 private minutes in your dressing mirror with your own shoes and jewelry.
              </p>
            </div>
            <div className="pt-3 border-t border-neutral-100 text-[11px] font-bold text-[#b91c1c] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>White-Glove Presentation</span>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 hover:border-[#14293a] p-6 sm:p-7 rounded-xs shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-[#fef2f2] border border-red-100 flex items-center justify-center text-[#b91c1c] font-bold text-xs">
                  03
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079]">
                  Step Three
                </span>
              </div>
              <h3 className="font-sans text-lg font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors">
                Keep What Fits & Settle
              </h3>
              <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed font-sans">
                Keep the pieces that fit impeccably. Hand back what doesn&apos;t directly to the courier. Settle only what you retain via UPI or card.
              </p>
            </div>
            <div className="pt-3 border-t border-neutral-100 text-[11px] font-bold text-[#b91c1c] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Doorstep Instant Billing</span>
            </div>
          </div>
        </div>

        {/* Interactive Pincode Serviceability Box */}
        <div className="bg-white border border-[#d3d6db] p-6 sm:p-8 rounded-sm shadow-sm max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-[#14293a] flex items-center justify-center sm:justify-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#b91c1c]" />
                <span>Check Rapid Doorstep Service</span>
              </h4>
              <p className="text-xs text-[#6c7079]">
                Serving approved pincodes across major metropolitan hubs.
              </p>
            </div>

            {/* Active serviceable badge if user already has a valid PIN */}
            {isHydrated && isServiceable && pincode && !isChanging ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-sm text-xs font-bold text-[#065f46] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Active in {city || 'Your Hub'} ({pincode})
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs font-bold text-[#6c7079] hover:text-[#14293a] underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheck} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  maxLength={6}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN"
                  className="w-36 sm:w-44 px-3 py-2 text-xs font-sans border border-[#d3d6db] rounded-sm focus:outline-none focus:border-[#14293a] bg-[#f8f8f8]"
                />
                <button
                  type="submit"
                  disabled={loading || inputPin.length !== 6}
                  className="px-4 py-2 bg-[#14293a] hover:bg-[#b91c1c] disabled:bg-[#d3d6db] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Check</span>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Feedback messages */}
          {successMsg && (
            <div className="mt-4 p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-sm text-xs text-[#065f46] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 bg-[#fffbeb] border border-[#fde68a] rounded-sm text-xs text-[#92400e] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[#6c7079]">
              Nominal ₹99 fitting fee refunded automatically upon keeping any garment.
            </span>
            <Link
              href="/shop?delivery=try_on"
              className="text-[#b91c1c] hover:text-[#991b1b] font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <span>Explore Try-On Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
