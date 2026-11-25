'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  X,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Tag,
  Star,
  ExternalLink,
} from 'lucide-react'
import type { PopupCampaign, PopupType } from '@repo/supabase'

export function UniversalPopupEngine() {
  const pathname = usePathname()
  const router = useRouter()

  const [candidatePopups, setCandidatePopups] = useState<PopupCampaign[]>([])
  const [activePopup, setActivePopup] = useState<PopupCampaign | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Track timers and listeners to clean up
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredRef = useRef(false)

  // Fetch active popups for current route
  useEffect(() => {
    let isMounted = true
    setActivePopup(null)
    setIsDismissed(false)
    hasTriggeredRef.current = false

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const fetchPopups = async () => {
      try {
        const res = await fetch(`/api/popups/active?pathname=${encodeURIComponent(pathname)}`)
        const data = await res.json()
        if (isMounted && data.success && Array.isArray(data.popups)) {
          setCandidatePopups(data.popups)
        }
      } catch {
        // Fallback silently
      }
    }

    fetchPopups()

    return () => {
      isMounted = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [pathname])

  // Track impressions
  const recordEvent = useCallback(async (popupId: string, event: 'impression' | 'click') => {
    try {
      await fetch('/api/popups/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popupId, event }),
      })
    } catch {
      // Fire and forget
    }
  }, [])

  // Check frequency capping
  const isFrequencyAllowed = useCallback((popup: PopupCampaign): boolean => {
    if (popup.frequency === 'always') return true

    if (popup.frequency === 'once_per_session') {
      try {
        const dismissed = sessionStorage.getItem(`tg_popup_dismissed_${popup.id}`)
        return !dismissed
      } catch {
        return true
      }
    }

    if (popup.frequency === 'once_per_user') {
      try {
        const dismissed = localStorage.getItem(`tg_popup_dismissed_${popup.id}`)
        return !dismissed
      } catch {
        return true
      }
    }

    return true
  }, [])

  // Dismiss popup & save frequency
  const handleDismiss = useCallback(
    (popup: PopupCampaign) => {
      setActivePopup(null)
      setIsDismissed(true)

      try {
        if (popup.frequency === 'once_per_session') {
          sessionStorage.setItem(`tg_popup_dismissed_${popup.id}`, 'true')
        } else if (popup.frequency === 'once_per_user') {
          localStorage.setItem(`tg_popup_dismissed_${popup.id}`, 'true')
        }
      } catch {}
    },
    []
  )

  // Trigger evaluation
  useEffect(() => {
    if (candidatePopups.length === 0 || activePopup || isDismissed) return

    // Pick the first allowed popup for this page
    const candidate = candidatePopups.find((p) => isFrequencyAllowed(p))
    if (!candidate) return

    const launchPopup = () => {
      if (hasTriggeredRef.current) return
      hasTriggeredRef.current = true
      setActivePopup(candidate)
      recordEvent(candidate.id, 'impression')
    }

    // 1. Immediate trigger
    if (candidate.trigger === 'immediate') {
      timerRef.current = setTimeout(launchPopup, 600)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    // 2. Delay trigger
    if (candidate.trigger === 'delay') {
      const ms = Math.max(1, candidate.trigger_delay_seconds || 3) * 1000
      timerRef.current = setTimeout(launchPopup, ms)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    // 3. Scroll depth trigger
    if (candidate.trigger === 'scroll') {
      const targetPct = candidate.trigger_scroll_percentage || 30
      const onScroll = () => {
        const docElem = document.documentElement
        const totalHeight = docElem.scrollHeight - docElem.clientHeight
        if (totalHeight <= 0) return
        const currentPct = (window.scrollY / totalHeight) * 100
        if (currentPct >= targetPct) {
          launchPopup()
          window.removeEventListener('scroll', onScroll)
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    // 4. Exit intent trigger
    if (candidate.trigger === 'exit_intent') {
      const onMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 10) {
          launchPopup()
          document.removeEventListener('mouseleave', onMouseLeave)
        }
      }
      document.addEventListener('mouseleave', onMouseLeave)
      return () => document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [candidatePopups, activePopup, isDismissed, isFrequencyAllowed, recordEvent])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePopup) {
        handleDismiss(activePopup)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePopup, handleDismiss])

  if (!activePopup) return null

  // Handle CTA Click
  const handlePrimaryCtaClick = () => {
    recordEvent(activePopup.id, 'click')
    const cta = activePopup.primary_cta
    if (!cta) return

    if (cta.action === 'copy_code' && cta.coupon_code) {
      navigator.clipboard.writeText(cta.coupon_code)
      setCopiedCode(true)
      setTimeout(() => {
        if (cta.link) {
          handleDismiss(activePopup)
          router.push(cta.link)
        }
      }, 700)
    } else if (cta.action === 'navigate' && cta.link) {
      handleDismiss(activePopup)
      router.push(cta.link)
    } else if (cta.action === 'dismiss') {
      handleDismiss(activePopup)
    }
  }

  const handleSecondaryCtaClick = () => {
    const cta = activePopup.secondary_cta
    if (!cta) return

    if (cta.action === 'navigate' && cta.link) {
      recordEvent(activePopup.id, 'click')
      handleDismiss(activePopup)
      router.push(cta.link)
    } else {
      handleDismiss(activePopup)
    }
  }

  // Visual layout rendering based on position
  return (
    <>
      {/* 1. CENTER MODAL OVERLAY */}
      {activePopup.position === 'center_modal' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDismiss(activePopup)
          }}
        >
          <div className="bg-white text-[#14293a] border border-[#d3d6db] rounded-sm max-w-md w-full overflow-hidden relative shadow-2xl my-8 font-sans animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => handleDismiss(activePopup)}
              className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close pop-up"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Banner Image */}
            {activePopup.banner_image_url && (
              <div className="relative h-44 sm:h-48 w-full bg-[#f8f9fa] overflow-hidden">
                <Image
                  src={activePopup.banner_image_url}
                  alt={activePopup.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-4">
              <div className="space-y-1.5">
                {activePopup.badge_text && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#b91c1c] font-bold block">
                    {activePopup.badge_text}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-bold text-[#14293a] leading-tight font-sans">
                  {activePopup.headline}
                </h3>
                {activePopup.subheadline && (
                  <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
                    {activePopup.subheadline}
                  </p>
                )}
              </div>

              {/* Coupon Code One-Click Box */}
              {activePopup.primary_cta?.action === 'copy_code' &&
                activePopup.primary_cta.coupon_code && (
                  <div className="p-3 bg-[#f8f9fa] border border-dashed border-[#d3d6db] rounded-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#6c7079] font-mono font-bold block">
                        COUPON CODE
                      </span>
                      <span className="font-mono font-bold text-sm text-[#14293a] tracking-wider">
                        {activePopup.primary_cta.coupon_code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (activePopup.primary_cta?.coupon_code) {
                          navigator.clipboard.writeText(activePopup.primary_cta.coupon_code)
                          setCopiedCode(true)
                          setTimeout(() => setCopiedCode(false), 2000)
                        }
                      }}
                      className="px-3 py-1.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryCtaClick}
                  className="w-full py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{activePopup.primary_cta?.text || 'Shop Now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {activePopup.secondary_cta && (
                  <button
                    type="button"
                    onClick={handleSecondaryCtaClick}
                    className="w-full py-1.5 text-xs text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer text-center font-medium"
                  >
                    {activePopup.secondary_cta.text}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BOTTOM RIGHT FLOATING CORNER DRAWER */}
      {activePopup.position === 'bottom_right' && (
        <aside
          aria-label="Announcement"
          className="fixed bottom-4 right-4 z-40 w-[90vw] sm:w-[340px] bg-white text-[#14293a] border border-[#d3d6db] rounded-sm shadow-2xl overflow-hidden font-sans animate-in slide-in-from-bottom-5 duration-300"
        >
          {/* Header Strip */}
          <div className="px-3.5 py-2 bg-[#f8f9fa] border-b border-[#e5e7eb] flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#b91c1c] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{activePopup.badge_text || 'FEATURE SPOTLIGHT'}</span>
            </span>
            <button
              onClick={() => handleDismiss(activePopup)}
              className="text-[#8a909a] hover:text-[#14293a] p-0.5 rounded-xs transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Banner Thumbnail (if available) */}
          {activePopup.banner_image_url && (
            <div className="relative h-28 w-full bg-[#f8f9fa] overflow-hidden">
              <Image
                src={activePopup.banner_image_url}
                alt={activePopup.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Drawer Content */}
          <div className="p-4 space-y-3">
            <div>
              <h4 className="font-bold text-sm text-[#14293a] leading-tight">
                {activePopup.headline}
              </h4>
              {activePopup.subheadline && (
                <p className="text-xs text-[#6c7079] mt-1 line-clamp-2 leading-relaxed">
                  {activePopup.subheadline}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrimaryCtaClick}
                className="flex-1 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{activePopup.primary_cta?.text || 'Explore'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              {activePopup.secondary_cta && (
                <button
                  type="button"
                  onClick={handleSecondaryCtaClick}
                  className="px-3 py-2 text-xs text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer"
                >
                  {activePopup.secondary_cta.text}
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* 3. STICKY BOTTOM BAR */}
      {activePopup.position === 'bottom_bar' && (
        <aside
          aria-label="Announcement"
          className="fixed bottom-0 inset-x-0 z-40 bg-white text-[#14293a] border-t border-[#d3d6db] px-4 py-3 shadow-xl flex items-center justify-between gap-4 font-sans animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center gap-3 truncate">
            {activePopup.badge_text && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold text-[#b91c1c] bg-rose-50 border border-rose-200 shrink-0">
                {activePopup.badge_text}
              </span>
            )}
            <div className="truncate">
              <span className="font-bold text-xs sm:text-sm text-[#14293a] mr-2">
                {activePopup.headline}
              </span>
              {activePopup.subheadline && (
                <span className="hidden md:inline text-xs text-[#6c7079]">
                  {activePopup.subheadline}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrimaryCtaClick}
              className="px-4 py-1.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xs transition-colors shadow-xs"
            >
              {activePopup.primary_cta?.text || 'Shop Now'}
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(activePopup)}
              className="p-1 text-[#8a909a] hover:text-[#14293a] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 4. TOP ANNOUNCEMENT BANNER */}
      {activePopup.position === 'top_banner' && (
        <aside
          aria-label="Announcement"
          className="fixed top-0 inset-x-0 z-50 bg-[#14293a] text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-sans animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2 truncate mx-auto">
            {activePopup.badge_text && (
              <span className="font-mono text-2xs uppercase tracking-wider text-amber-300 font-bold">
                {activePopup.badge_text}
              </span>
            )}
            <span className="font-medium truncate">{activePopup.headline}</span>
            {activePopup.primary_cta?.link && (
              <button
                type="button"
                onClick={handlePrimaryCtaClick}
                className="underline underline-offset-2 hover:text-amber-300 font-bold ml-1 transition-colors"
              >
                {activePopup.primary_cta.text} →
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(activePopup)}
            className="text-neutral-400 hover:text-white transition-colors p-0.5"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}
    </>
  )
}
