'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Clock, ShieldCheck, X, Sparkles, ArrowRight } from 'lucide-react'
import { useHydratedBolt } from '../store/useBoltStore'

export function BoltTryOnDiscoveryCard() {
  const {
    isHydrated,
    pincode,
    city,
    isServiceable,
    isDiscoveryDismissed,
    hasAttemptedDetection,
    setPincode,
    setDiscoveryDismissed,
    setHasAttemptedDetection,
  } = useHydratedBolt()

  const [mounted, setMounted] = useState(false)

  // 1. Auto-Location Discovery on Mount
  useEffect(() => {
    setMounted(true)

    if (isHydrated && !hasAttemptedDetection && !pincode) {
      setHasAttemptedDetection(true)

      fetch('/api/location/detect')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data.pincode) {
            setPincode(data.pincode, Boolean(data.serviceable), data.city || null)
          }
        })
        .catch((err) => {
          console.warn('Auto-location detection note:', err)
        })
    }
  }, [isHydrated, hasAttemptedDetection, pincode, setPincode, setHasAttemptedDetection])

  // Don't render before hydration or if dismissed or not serviceable
  if (!mounted || !isHydrated || !isServiceable || isDiscoveryDismissed) {
    return null
  }

  const cityName = city || 'your area'

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bolt-discovery-popup fixed bottom-6 right-4 sm:right-6 z-40 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto p-5 sm:p-6 bg-white text-[#14293a] border border-[#d3d6db] rounded-sm shadow-2xl font-sans"
        role="region"
        aria-label="Bolt Try-On Discovery Card"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#b91c1c] rounded-t-sm" />

        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" />
              BOLT TRY-ON AVAILABLE • {cityName.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => setDiscoveryDismissed(true)}
            className="p-1 text-[#8a909a] hover:text-[#14293a] transition-colors rounded-sm cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Headline */}
        <div className="pt-3 space-y-1">
          <h3 className="font-sans text-base sm:text-lg font-bold uppercase tracking-tight text-[#14293a] leading-snug">
            THE ATELIER MIRROR,{' '}
            <span className="text-[#b91c1c]">BROUGHT TO YOUR DOOR</span>
          </h3>
          <p className="text-xs text-[#6c7079] leading-relaxed">
            Your postal zone <strong className="text-[#14293a]">{pincode}</strong> qualifies for our white-glove doorstep salon.
          </p>
        </div>

        {/* 3 Core Experience Pillars */}
        <div className="py-3.5 space-y-2 text-xs text-[#14293a]">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-sm bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3 text-[#b91c1c]" />
            </div>
            <span>
              <strong className="font-semibold text-[#14293a]">45-Minute In-Home Salon</strong>
              <span className="text-[#6c7079]">: Scheduled fitting window</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-sm bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-[#b91c1c]" />
            </div>
            <span>
              <strong className="font-semibold text-[#14293a]">Try Up to 5 Garments</strong>
              <span className="text-[#6c7079]"> before authorizing total payment</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-sm bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
            </div>
            <span>
              <strong className="font-semibold text-[#14293a]">Keep What Fits</strong>
              <span className="text-[#6c7079]">; courier returns the rest instantly</span>
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 flex items-center gap-3">
          <Link
            href="/shop?delivery=try_on"
            onClick={() => setDiscoveryDismissed(true)}
            className="flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm flex items-center justify-center gap-1.5 transition-all bg-[#14293a] text-white hover:bg-[#b91c1c] cursor-pointer"
          >
            <span>EXPLORE TRY-ON PIECES</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </Link>

          <button
            onClick={() => setDiscoveryDismissed(true)}
            className="text-xs text-[#6c7079] hover:text-[#14293a] px-3 py-1.5 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
