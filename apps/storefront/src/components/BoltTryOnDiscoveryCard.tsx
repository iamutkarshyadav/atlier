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
        className="bolt-discovery-popup fixed bottom-6 right-4 sm:right-6 z-40 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto p-5 sm:p-6 rounded-none shadow-2xl font-sans"
        style={{
          backgroundColor: '#18181A',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
        role="region"
        aria-label="Bolt Try-On Discovery Card"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-none h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              BOLT ⚡ TRY-ON AVAILABLE • {cityName.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => setDiscoveryDismissed(true)}
            className="bolt-close-btn p-1 transition-colors cursor-pointer rounded-none hover:bg-white/10"
            style={{ color: '#A1A1AA' }}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Editorial Headline */}
        <div className="pt-3 space-y-1.5">
          <h3
            className="bolt-title font-display text-base sm:text-lg font-extrabold uppercase tracking-tight leading-snug"
            style={{ color: '#FFFFFF' }}
          >
            THE ATELIER MIRROR,{' '}
            <span className="bolt-crimson-text text-[#EF4444]" style={{ color: '#EF4444' }}>
              BROUGHT TO YOUR DOOR
            </span>
          </h3>
          <p
            className="bolt-desc text-xs font-light leading-relaxed"
            style={{ color: '#D4D4D8' }}
          >
            Your postal zone{' '}
            <span
              className="bolt-pincode font-mono font-semibold"
              style={{ color: '#FFFFFF' }}
            >
              {pincode}
            </span>{' '}
            qualifies for our white-glove doorstep salon.
          </p>
        </div>

        {/* 3 Core Experience Pillars */}
        <div
          className="py-3.5 space-y-2.5 font-mono text-[11px]"
          style={{ color: '#D4D4D8' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="bolt-icon-box w-5 h-5 rounded-none flex items-center justify-center shrink-0"
              style={{
                backgroundColor: '#262629',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FBBF24',
              }}
            >
              <Clock className="w-3 h-3 text-amber-400" />
            </div>
            <span>
              <strong className="font-bold" style={{ color: '#FFFFFF' }}>
                45-Minute In-Home Salon
              </strong>
              <span className="bolt-pillar-subtext" style={{ color: '#A1A1AA' }}>
                : Scheduled fitting window
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="bolt-icon-box w-5 h-5 rounded-none flex items-center justify-center shrink-0"
              style={{
                backgroundColor: '#262629',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FBBF24',
              }}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <span>
              <strong className="font-bold" style={{ color: '#FFFFFF' }}>
                Try Up to 5 Garments
              </strong>
              <span className="bolt-pillar-subtext" style={{ color: '#A1A1AA' }}>
                {' '}
                before authorizing total payment
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="bolt-icon-box w-5 h-5 rounded-none flex items-center justify-center shrink-0"
              style={{
                backgroundColor: '#262629',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#34D399',
              }}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <span>
              <strong className="font-bold" style={{ color: '#FFFFFF' }}>
                Keep What Fits
              </strong>
              <span className="bolt-pillar-subtext" style={{ color: '#A1A1AA' }}>
                ; courier returns the rest instantly
              </span>
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2 flex items-center gap-3">
          <Link
            href="/shop"
            onClick={() => setDiscoveryDismissed(true)}
            className="bolt-explore-btn flex-1 py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider rounded-none shadow-lg flex items-center justify-center gap-1.5 transition-all group cursor-pointer hover:bg-neutral-900"
            style={{
              backgroundColor: '#09090B',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.9)',
            }}
          >
            <span style={{ color: '#FFFFFF' }}>EXPLORE PIECES</span>
            <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-x-1" />
          </Link>

          <button
            onClick={() => setDiscoveryDismissed(true)}
            className="bolt-snooze-btn text-xs font-mono px-3 py-1.5 transition-colors cursor-pointer hover:text-white"
            style={{ color: '#A1A1AA' }}
          >
            Snooze
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

