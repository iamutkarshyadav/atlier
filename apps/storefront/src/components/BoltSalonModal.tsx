'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  RotateCcw,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { useHydratedBolt } from '../store/useBoltStore'

export interface BoltSalonModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BoltSalonModal({ isOpen, onClose }: BoltSalonModalProps) {
  const router = useRouter()
  const { pincode, city, isServiceable, isHydrated, setPincode, clearPincode } = useHydratedBolt()

  const [inputPin, setInputPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isChangingPin, setIsChangingPin] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

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
            `PIN ${trimmed} is currently outside our 45-minute doorstep try-on radius.`
        )
      }
    } catch {
      setErrorMsg('Failed to verify postal code serviceability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartDoorstepShopping = () => {
    onClose()
    router.push('/shop?delivery=try_on')
  }

  const handleStandardShopping = () => {
    onClose()
    router.push('/shop')
  }

  const handleResetPin = () => {
    clearPincode()
    setIsChangingPin(true)
    setInputPin('')
    setErrorMsg(null)
  }

  const cityName = city || 'your area'
  const isBoltActive = isHydrated && isServiceable && Boolean(pincode)
  const isBoltUnavailable = isHydrated && !isServiceable && Boolean(pincode)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Slide-Over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-lg h-full bg-white text-[#14293a] shadow-2xl flex flex-col z-10 overflow-hidden font-sans"
          >
            {/* Drawer Top Bar */}
            <div className="p-5 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f8f8f8]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#14293a] text-white rounded-xs">
                  <Zap className="w-4 h-4 fill-[#b91c1c] text-[#b91c1c]" />
                </span>
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#14293a]">
                    BOLT 45-MIN DOORSTEP SALON
                  </h3>
                  <p className="text-[11px] text-[#6c7079]">
                    The fitting salon comes directly to your mirror
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-[#6c7079] hover:text-[#14293a] hover:bg-neutral-200/50 rounded-sm transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Editorial Intro Banner */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#b91c1c] block">
                  EXCLUSIVE SERVICE
                </span>
                <h2 className="font-sans text-2xl font-bold tracking-tight text-[#14293a] leading-snug">
                  Never Buy the Wrong Size or Silhouette Again
                </h2>
                <p className="text-xs text-[#6c7079] leading-relaxed">
                  Curate up to 5 garments online. A dedicated courier delivers them to your doorstep in 45 minutes with a personal wardrobe tote. Try them on in your mirror, keep what fits, and hand the rest back right at your door.
                </p>
              </div>

              {/* 3 Step Process Strip */}
              <div className="bg-[#f8f8f8] border border-[#d3d6db] rounded-sm p-4 space-y-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a909a] block">
                  HOW THE 45-MINUTE FITTING WORKS
                </span>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#d3d6db] flex items-center justify-center font-bold text-[11px] text-[#14293a] shrink-0 shadow-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-[#14293a]">Curate Up to 5 Silhouettes</p>
                      <p className="text-[#6c7079] text-[11px]">
                        Add items with the Bolt tag to your doorstep bag at zero upfront fee.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#d3d6db] flex items-center justify-center font-bold text-[11px] text-[#14293a] shrink-0 shadow-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-[#14293a]">45-Minute Rapid Doorstep Arrival</p>
                      <p className="text-[#6c7079] text-[11px]">
                        Our rapid courier brings your garments in an atelier travel wardrobe tote.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-[#d3d6db] flex items-center justify-center font-bold text-[11px] text-[#14293a] shrink-0 shadow-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-[#14293a]">15-Min Mirror Fitting & Settle</p>
                      <p className="text-[#6c7079] text-[11px]">
                        Try them in your comfort. Keep what fits and settle on-the-spot via UPI or card.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SERVICEABILITY STATUS & CHECKER */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#14293a] block">
                  DELIVERY POSTAL CODE AVAILABILITY
                </span>

                {/* State A: Serviceable Hub */}
                {isBoltActive && !isChangingPin && (
                  <div className="p-4 bg-[#ecfdf5] border border-[#a7f3d0] rounded-sm space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#065f46]">
                          Bolt 45-Min Doorstep Fitting is Active in {cityName} (PIN {pincode})
                        </p>
                        <p className="text-[11px] text-[#047857] mt-0.5">
                          Rapid dispatch couriers are on standby in your area.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#a7f3d0]/60">
                      <button
                        onClick={handleStartDoorstepShopping}
                        className="w-full py-2.5 px-4 bg-[#14293a] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" />
                        <span>Explore Doorstep Collection →</span>
                      </button>

                      <button
                        onClick={handleResetPin}
                        className="text-[11px] text-[#065f46] hover:underline font-semibold text-center cursor-pointer"
                      >
                        Check a different postal code
                      </button>
                    </div>
                  </div>
                )}

                {/* State B: Unserviceable PIN */}
                {isBoltUnavailable && !isChangingPin && (
                  <div className="p-4 bg-[#fff1f2] border border-[#fecdd3] rounded-sm space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-[#e11d48] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#9f1239]">
                          PIN {pincode} is Outside 45-Min Rapid Delivery Radius
                        </p>
                        <p className="text-[11px] text-[#881337] mt-1 leading-relaxed">
                          Our rapid try-on fleet is currently active in select hubs. Don&apos;t worry—all Maison TG silhouettes are available with <strong>Complimentary Pan-India Express Delivery (2–4 days)</strong> and 7-day doorstep exchanges!
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-[#fecdd3]/60">
                      <button
                        onClick={handleStandardShopping}
                        className="w-full py-2.5 px-4 bg-[#14293a] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Shop with Pan-India Express Delivery →</span>
                      </button>

                      <button
                        onClick={handleResetPin}
                        className="text-[11px] text-[#9f1239] hover:underline font-semibold text-center cursor-pointer"
                      >
                        Try another postal code
                      </button>
                    </div>
                  </div>
                )}

                {/* State C: PIN Input Form (No PIN or changing PIN) */}
                {(!pincode || isChangingPin) && (
                  <form onSubmit={handleCheckPincode} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="w-3.5 h-3.5 text-[#6c7079] absolute left-3 top-3" />
                        <input
                          type="text"
                          maxLength={6}
                          value={inputPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                            setInputPin(val)
                            setErrorMsg(null)
                          }}
                          placeholder="Enter 6-digit delivery PIN"
                          className="w-full bg-[#f8f8f8] border border-[#d3d6db] pl-8 pr-3 py-2 text-xs text-[#14293a] rounded-sm focus:outline-none focus:border-[#14293a] font-mono tracking-wider"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || inputPin.length !== 6}
                        className="px-4 py-2 bg-[#14293a] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                      </button>
                    </div>

                    {errorMsg && (
                      <p className="text-[11px] text-[#b91c1c] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errorMsg}</span>
                      </p>
                    )}

                    <p className="text-[11px] text-[#6c7079]">
                      Available in serviceable metro hubs with 45-minute dispatch.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Drawer Bottom Bar */}
            <div className="p-4 border-t border-[#e5e7eb] bg-[#f8f8f8] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#6c7079] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                <span>Zero upfront risk • Free fitting</span>
              </span>

              <button
                onClick={handleStandardShopping}
                className="font-bold text-[#14293a] hover:text-[#b91c1c] transition-colors cursor-pointer"
              >
                Continue Standard Shopping →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
