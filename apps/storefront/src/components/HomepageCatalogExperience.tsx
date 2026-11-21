'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Zap,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import type { Product } from '@repo/supabase/utils'
import { useHydratedBolt } from '../store/useBoltStore'
import { CategoryStrip } from './CategoryStrip'
import { ProductCard } from './ProductCard'

export interface HomepageCatalogExperienceProps {
  products: Product[]
}

export function HomepageCatalogExperience({ products }: HomepageCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'bolt' ? 'bolt' : 'all'

  const [mode, setMode] = useState<'all' | 'bolt'>(initialMode)
  const { pincode, city, isServiceable, setPincode, clearPincode, isHydrated } = useHydratedBolt()

  const [inputPin, setInputPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isChangingPin, setIsChangingPin] = useState(false)

  // Sync mode if query param changes or popstate fires
  useEffect(() => {
    const paramMode = searchParams.get('mode')
    if (paramMode === 'bolt') {
      setMode('bolt')
    } else if (paramMode === 'all') {
      setMode('all')
    }
  }, [searchParams])

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const pMode = params.get('mode')
      if (pMode === 'bolt') setMode('bolt')
      else if (pMode === 'all') setMode('all')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSwitchMode = (newMode: 'all' | 'bolt') => {
    setMode(newMode)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('mode', newMode)
      url.hash = 'catalog'
      window.history.pushState({}, '', url.toString())
      window.dispatchEvent(new Event('popstate'))
    }
  }

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputPin.trim()
    if (!trimmed || trimmed.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit postal code.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.serviceable) {
        setPincode(trimmed, true, data.city || null)
        setIsChangingPin(false)
        setInputPin('')
        setErrorMsg(null)
      } else {
        setPincode(trimmed, false, null)
        setErrorMsg(
          data.message ||
            `PIN ${trimmed} is currently outside our 45-minute rapid try-on radius. Standard express delivery is available India-wide!`
        )
      }
    } catch {
      setErrorMsg('Failed to verify postal code serviceability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPin = () => {
    clearPincode()
    setIsChangingPin(true)
    setInputPin('')
    setErrorMsg(null)
  }

  const cityName = city || 'your area'
  const isBoltServiceable = isHydrated && isServiceable && Boolean(pincode)

  // Curate products
  const standardProducts = products.slice(0, 8)
  const boltProducts = products.slice(0, 8)

  return (
    <div id="catalog" className="bg-white py-14 sm:py-16 font-sans scroll-mt-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ========================================================= */}
        {/* 1. SECTION HEADER & DUAL-MODE TAB SWITCHER                */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#d3d6db] mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c] block mb-1">
              STORE CATALOG
            </span>
            <h2 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[#14293a]">
              {mode === 'all' ? 'All Products & Collections' : 'Exclusive Bolt 45-Min Try-On'}
            </h2>
            <p className="text-xs text-[#6c7079] mt-1 max-w-xl">
              {mode === 'all'
                ? 'Standard nationwide delivery on all core releases. Crafted from 480 GSM French Terry and raw selvedge.'
                : `Rapid 45-minute doorstep try-on in select serviceable hubs. Try up to 5 items before payment.`}
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="inline-flex items-center p-1 bg-[#f1f1f1] border border-[#d3d6db] rounded-sm self-start md:self-auto shrink-0 shadow-xs">
            <button
              onClick={() => handleSwitchMode('all')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'all'
                  ? 'bg-white text-[#14293a] shadow-xs'
                  : 'text-[#6c7079] hover:text-[#14293a]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>All Shopping</span>
            </button>

            <button
              onClick={() => handleSwitchMode('bolt')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'bolt'
                  ? 'bg-[#14293a] text-white shadow-xs'
                  : 'text-[#6c7079] hover:text-[#14293a]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" />
              <span>Bolt Try-On</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODE A: ALL SHOPPING (STANDARD PAN-INDIA CATALOG)          */}
        {/* ========================================================= */}
        {mode === 'all' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Category Quick Strip */}
            <CategoryStrip />

            {/* Standard Products Showcase */}
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e5e7eb]">
                <div>
                  <h3 className="font-sans text-lg sm:text-xl font-bold text-[#14293a]">
                    New Arrivals & Core Releases
                  </h3>
                  <span className="text-xs text-[#6c7079]">
                    Complimentary express delivery across India on orders over ₹1,999
                  </span>
                </div>

                <Link
                  href="/shop"
                  className="text-xs font-sans uppercase font-bold text-[#14293a] hover:text-[#b91c1c] flex items-center gap-1 transition-colors tracking-wider shrink-0"
                >
                  <span>View All &rarr;</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {standardProducts.map((prod, idx) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    priority={idx < 4}
                    showTryOnBadge={false}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE B: BOLT TRY-ON (EXCLUSIVE 45-MIN DOORSTEP)           */}
        {/* ========================================================= */}
        {mode === 'bolt' && (
          <div className="space-y-8 animate-fadeIn">
            {/* CASE 1: APPROVED / SERVICEABLE PINCODE */}
            {isBoltServiceable && !isChangingPin ? (
              <>
                {/* Active Service Status Bar */}
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-sm p-4 text-xs font-sans text-[#065f46] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-[#064e3b] text-sm block sm:inline mr-2">
                        Bolt 45-Minute Doorstep Try-On Active
                      </span>
                      <span>
                        Serviceable in <strong className="underline">{cityName}</strong> (PIN: <strong>{pincode}</strong>). Curate up to 5 silhouettes to try in front of your own mirror.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleResetPin}
                      className="px-3 py-1.5 bg-white text-[#065f46] hover:bg-[#064e3b] hover:text-white border border-[#a7f3d0] rounded-sm font-bold uppercase tracking-wider text-[11px] transition-colors cursor-pointer"
                    >
                      Change PIN
                    </button>
                    <Link
                      href="/shop?delivery=try_on"
                      className="px-3 py-1.5 bg-[#064e3b] text-white hover:bg-[#065f46] rounded-sm font-bold uppercase tracking-wider text-[11px] transition-colors"
                    >
                      All Try-On Items &rarr;
                    </Link>
                  </div>
                </div>

                {/* 3-Step Process Micro-Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                  <div className="bg-[#f8f8f8] border border-[#d3d6db] p-4 rounded-sm flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#14293a] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      01
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                        Select Up to 5 Items
                      </h4>
                      <p className="text-[11px] text-[#6c7079]">
                        Choose multiple sizes without upfront full checkout.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#f8f8f8] border border-[#d3d6db] p-4 rounded-sm flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#14293a] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      02
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                        45-Min Mirror Fitting
                      </h4>
                      <p className="text-[11px] text-[#6c7079]">
                        Dedicated courier waits while you try in privacy.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#f8f8f8] border border-[#d3d6db] p-4 rounded-sm flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#14293a] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      03
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                        Keep & Settle at Door
                      </h4>
                      <p className="text-[11px] text-[#6c7079]">
                        Hand back unwanted sizes; pay via UPI or card.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bolt-Eligible Products Grid */}
                <div>
                  <div className="flex items-center justify-between pb-3 mb-6 border-b border-[#e5e7eb]">
                    <div>
                      <h3 className="font-sans text-lg sm:text-xl font-bold text-[#14293a]">
                        Try-On Eligible Silhouettes
                      </h3>
                      <span className="text-xs text-[#6c7079]">
                        Select up to 5 pieces. Nominal ₹99 fitting fee refunded automatically upon keeping any garment.
                      </span>
                    </div>

                    <Link
                      href="/shop?delivery=try_on"
                      className="text-xs font-sans uppercase font-bold text-[#14293a] hover:text-[#b91c1c] flex items-center gap-1 transition-colors tracking-wider shrink-0"
                    >
                      <span>Explore All Try-On &rarr;</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {boltProducts.map((prod, idx) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        priority={idx < 4}
                        showTryOnBadge={true}
                        badgeLabel="45-MIN TRY-ON"
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* CASE 2: PINCODE NOT APPROVED / OUTSIDE SERVICEABLE AREAS */
              <div className="bg-[#f8f8f8] border border-[#d3d6db] rounded-sm p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm space-y-6">
                <div className="w-14 h-14 rounded-full bg-white border border-[#d3d6db] mx-auto flex items-center justify-center text-[#14293a] shadow-xs">
                  <MapPin className="w-7 h-7 text-[#b91c1c]" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#b91c1c]">
                    DOORSTEP SERVICE AVAILABILITY
                  </span>
                  <h3 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
                    Bolt 45-Minute Try-On is not yet launched in{' '}
                    <span className="underline decoration-[#b91c1c]">{pincode ? `PIN ${pincode}` : 'your area'}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed max-w-lg mx-auto">
                    Our rapid 45-minute white-glove mirror salon is currently exclusive to select serviceable hubs approved by our atelier logistics. All standard silhouettes remain available with complimentary pan-India express shipping.
                  </p>
                </div>

                {/* Inline Pincode Verification Form */}
                <div className="bg-white border border-[#d3d6db] p-5 rounded-sm max-w-md mx-auto space-y-3 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                    Check Another Delivery Postal Code:
                  </span>

                  <form onSubmit={handleCheckPincode} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={inputPin}
                      onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit PIN"
                      className="w-full px-3.5 py-2 text-xs font-sans border border-[#d3d6db] rounded-sm focus:outline-none focus:border-[#14293a] bg-[#fafafa]"
                    />
                    <button
                      type="submit"
                      disabled={loading || inputPin.length !== 6}
                      className="px-5 py-2 bg-[#14293a] hover:bg-[#b91c1c] disabled:bg-[#d3d6db] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Verify</span>}
                    </button>
                  </form>

                  {errorMsg && (
                    <div className="p-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-sm text-xs text-[#92400e] text-left flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                {/* Back to Standard Shopping Action */}
                <div className="pt-2">
                  <button
                    onClick={() => setMode('all')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-[#14293a] text-[#14293a] hover:text-white border border-[#14293a] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs"
                  >
                    <span>&larr; Switch back to All Shopping (Pan-India Express)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
