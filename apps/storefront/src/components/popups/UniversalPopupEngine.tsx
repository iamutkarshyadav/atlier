'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  Zap,
} from 'lucide-react'
import type { PopupCampaign, PopupSurfaceTier } from '@repo/supabase'
import {
  selectWinningNudge,
  scoreNudgePriority,
  isGlobalCooldownActive,
  GLOBAL_DISMISS_COOLDOWN_SECONDS,
  MIN_ENTRY_DELAY_SECONDS,
  type NudgeContext,
  type NudgeSessionState,
} from '@repo/supabase'
import { useCartStore } from '../../store/useCartStore'

function UniversalNudgeOrchestratorContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { items, applyCouponCode, getSubtotal, getItemCount } = useCartStore()

  const [candidatePopups, setCandidatePopups] = useState<PopupCampaign[]>([])
  const [activeNudge, setActiveNudge] = useState<PopupCampaign | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  // References to manage timers and prevent duplicate triggers
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastPathRef = useRef<string>(pathname)
  const shownOnRouteRef = useRef<string[]>([])
  const hasTriggeredRef = useRef(false)

  // Build current session state from sessionStorage
  const getSessionState = useCallback((): NudgeSessionState => {
    try {
      const dismissedIdsStr = sessionStorage.getItem('tg_dismissed_popup_ids')
      const dismissedIds: string[] = dismissedIdsStr ? JSON.parse(dismissedIdsStr) : []
      const lastDismissedAt = sessionStorage.getItem('tg_nudge_dismissed_at')
      const modalShown = sessionStorage.getItem('tg_modal_shown_session') === 'true'

      return {
        dismissedPopupIds: dismissedIds,
        lastDismissedAt: lastDismissedAt ? Number(lastDismissedAt) : null,
        modalShownInSession: modalShown,
        nudgesShownOnCurrentRoute: shownOnRouteRef.current,
      }
    } catch {
      return {
        dismissedPopupIds: [],
        lastDismissedAt: null,
        modalShownInSession: false,
        nudgesShownOnCurrentRoute: shownOnRouteRef.current,
      }
    }
  }, [])

  // Fetch active candidate popups for the current route & searchParams
  useEffect(() => {
    let isMounted = true
    setActiveNudge(null)
    setIsDismissed(false)
    hasTriggeredRef.current = false
    setActionFeedback(null)

    // Reset route-specific nudge tracking on route change
    if (pathname !== lastPathRef.current) {
      lastPathRef.current = pathname
      shownOnRouteRef.current = []
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const fetchActivePopups = async () => {
      try {
        const queryStr = searchParams?.toString() || ''
        const url = `/api/popups/active?pathname=${encodeURIComponent(pathname)}${queryStr ? `&${queryStr}` : ''}`
        const res = await fetch(url)
        const data = await res.json()
        if (isMounted && data.success && Array.isArray(data.popups)) {
          setCandidatePopups(data.popups)
        }
      } catch {
        // Fallback silently
      }
    }

    fetchActivePopups()

    return () => {
      isMounted = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [pathname, searchParams])

  // Analytics event recording
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

  // Dismissal handler enforcing 90s global cooldown
  const handleDismiss = useCallback(
    (popup: PopupCampaign) => {
      setActiveNudge(null)
      setIsDismissed(true)

      try {
        const now = Date.now()
        sessionStorage.setItem('tg_nudge_dismissed_at', String(now))

        if (popup.surface_tier === 'center_modal' || popup.position === 'center_modal') {
          sessionStorage.setItem('tg_modal_shown_session', 'true')
        }

        const dismissedIdsStr = sessionStorage.getItem('tg_dismissed_popup_ids')
        const dismissedIds: string[] = dismissedIdsStr ? JSON.parse(dismissedIdsStr) : []
        if (!dismissedIds.includes(popup.id)) {
          dismissedIds.push(popup.id)
          sessionStorage.setItem('tg_dismissed_popup_ids', JSON.stringify(dismissedIds))
        }

        if (popup.frequency === 'once_per_user') {
          localStorage.setItem(`tg_popup_dismissed_${popup.id}`, 'true')
        }
      } catch {}
    },
    []
  )

  // Orchestrator Evaluation Loop
  useEffect(() => {
    if (candidatePopups.length === 0 || activeNudge || isDismissed || hasTriggeredRef.current) return

    const sessionState = getSessionState()
    if (isGlobalCooldownActive(sessionState)) return

    const cartCount = getItemCount()
    const cartSub = getSubtotal()

    const context: NudgeContext = {
      pathname,
      searchParams: searchParams ? Object.fromEntries(Array.from(searchParams.entries())) : {},
      cartItemCount: cartCount,
      cartSubtotal: cartSub,
      scrollDepthPct: 0,
      isExitIntent: false,
      isPdpEligible: pathname.startsWith('/product/'),
    }

    const { winner } = selectWinningNudge(candidatePopups, context, sessionState)
    if (!winner) return

    const launchNudge = () => {
      if (hasTriggeredRef.current) return
      const currentSession = getSessionState()
      if (isGlobalCooldownActive(currentSession)) return

      hasTriggeredRef.current = true
      setActiveNudge(winner)
      shownOnRouteRef.current.push(winner.id)
      recordEvent(winner.id, 'impression')
    }

    // 1. Minimum 4-Second Entry Delay for immediate or delay triggers
    if (winner.trigger === 'immediate' || winner.trigger === 'delay') {
      const delaySeconds = Math.max(
        MIN_ENTRY_DELAY_SECONDS,
        winner.trigger_delay_seconds || MIN_ENTRY_DELAY_SECONDS
      )
      timerRef.current = setTimeout(launchNudge, delaySeconds * 1000)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    // 2. Scroll Depth / Landing Scroll Trigger (≥40%)
    if (winner.trigger === 'scroll' || winner.trigger === 'landing_scroll') {
      const targetPct = winner.trigger === 'landing_scroll' ? 40 : (winner.trigger_scroll_percentage || 40)
      const onScroll = () => {
        const docElem = document.documentElement
        const totalHeight = docElem.scrollHeight - docElem.clientHeight
        if (totalHeight <= 0) return
        const currentPct = (window.scrollY / totalHeight) * 100
        if (currentPct >= targetPct) {
          launchNudge()
          window.removeEventListener('scroll', onScroll)
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    // 3. Exit Intent Trigger (Quarantined for Tier C Center Modal with Cart > 0)
    if (winner.trigger === 'exit_intent') {
      const onMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 10) {
          // If center modal, strictly require cart items
          if (winner.surface_tier === 'center_modal' && getItemCount() <= 0) return
          launchNudge()
          document.removeEventListener('mouseleave', onMouseLeave)
        }
      }
      document.addEventListener('mouseleave', onMouseLeave)
      return () => document.removeEventListener('mouseleave', onMouseLeave)
    }

    // 4. Cart Threshold Trigger
    if (winner.trigger === 'cart_threshold_near') {
      if (cartCount > 0) {
        timerRef.current = setTimeout(launchNudge, 2000)
        return () => {
          if (timerRef.current) clearTimeout(timerRef.current)
        }
      }
    }

    // 5. Eligible PDP View Trigger
    if (winner.trigger === 'eligible_pdp_view' && pathname.startsWith('/product/')) {
      timerRef.current = setTimeout(launchNudge, 3000)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
  }, [
    candidatePopups,
    activeNudge,
    isDismissed,
    pathname,
    searchParams,
    getItemCount,
    getSubtotal,
    getSessionState,
    recordEvent,
  ])

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeNudge) {
        handleDismiss(activeNudge)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeNudge, handleDismiss])

  if (!activeNudge) return null

  // CTA Click Action Handlers
  const handlePrimaryCtaClick = async () => {
    recordEvent(activeNudge.id, 'click')
    const cta = activeNudge.primary_cta
    if (!cta) return

    // 1-Tap Copy & Auto-Apply directly to cart store
    if (cta.action === 'copy_and_apply' || cta.action === 'copy_code') {
      const code = cta.coupon_code
      if (code) {
        try {
          await navigator.clipboard.writeText(code)
        } catch {}

        if (cta.action === 'copy_and_apply') {
          await applyCouponCode(code)
          setActionFeedback(`✓ Code ${code} copied & applied to cart!`)
        } else {
          setActionFeedback(`✓ Code ${code} copied!`)
        }

        setTimeout(() => {
          if (cta.link && cta.link !== pathname) {
            handleDismiss(activeNudge)
            router.push(cta.link)
          } else {
            handleDismiss(activeNudge)
          }
        }, 1200)
        return
      }
    }

    if (cta.action === 'navigate' && cta.link) {
      handleDismiss(activeNudge)
      router.push(cta.link)
      return
    }

    handleDismiss(activeNudge)
  }

  const handleSecondaryCtaClick = () => {
    const cta = activeNudge.secondary_cta
    if (cta?.action === 'navigate' && cta.link) {
      recordEvent(activeNudge.id, 'click')
      handleDismiss(activeNudge)
      router.push(cta.link)
    } else {
      handleDismiss(activeNudge)
    }
  }

  const surfaceTier: PopupSurfaceTier =
    activeNudge.surface_tier ||
    (activeNudge.position === 'center_modal'
      ? 'center_modal'
      : activeNudge.position === 'top_banner'
      ? 'top_bar'
      : 'bottom_sheet')

  if (
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register')
  ) {
    return null
  }

  return (
    <>
      {/* ============================================================== */}
      {/* TIER A: TOP ANNOUNCEMENT BAR (PASSIVE, DOCKED TO TOP)           */}
      {/* ============================================================== */}
      {surfaceTier === 'top_bar' && (
        <aside
          role="region"
          aria-label="Store announcement"
          className="fixed top-0 inset-x-0 z-50 bg-[#14293a] text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-sans animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2.5 truncate mx-auto">
            {activeNudge.badge_text && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 font-bold px-1.5 py-0.5 bg-amber-400/20 rounded">
                {activeNudge.badge_text}
              </span>
            )}
            <span className="font-medium truncate">{activeNudge.headline}</span>
            {activeNudge.subheadline && (
              <span className="hidden md:inline text-neutral-300 text-xs">
                • {activeNudge.subheadline}
              </span>
            )}
            {activeNudge.primary_cta?.coupon_code && (
              <button
                type="button"
                onClick={handlePrimaryCtaClick}
                className="underline underline-offset-2 hover:text-amber-300 font-mono font-bold ml-1 transition-colors cursor-pointer"
              >
                {actionFeedback || `${activeNudge.primary_cta.text} →`}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(activeNudge)}
            className="text-neutral-400 hover:text-white transition-colors p-1 cursor-pointer shrink-0"
            aria-label="Close announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* ============================================================== */}
      {/* TIER B: MOBILE BOTTOM SHEET / DESKTOP FLOATING CORNER PILL      */}
      {/* DEFAULT FOR SALES & PROMOTIONS (NON-BLOCKING UX)               */}
      {/* ============================================================== */}
      {(surfaceTier === 'bottom_sheet' || surfaceTier === 'floating_pill') && (
        <>
          {/* 1. Mobile Bottom Sheet (≤25% Viewport Height, Non-Blocking) */}
          <div className="block sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white text-[#14293a] border-t border-[#d3d6db] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[25vh] overflow-y-auto font-sans">
            {/* Grab Handle */}
            <div className="w-8 h-1 rounded-full bg-neutral-300 mx-auto mt-2 mb-1" />

            <div className="px-4 pb-3 pt-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#b91c1c] uppercase tracking-wide">
                      {activeNudge.badge_text || 'LIMITED PRIVILEGE'}
                    </span>
                    {activeNudge.primary_cta?.coupon_code && (
                      <span className="text-[10px] font-mono font-bold bg-[#14293a]/10 text-[#14293a] px-1.5 py-0.2 rounded">
                        {activeNudge.primary_cta.coupon_code}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-[#14293a] leading-tight">
                    {activeNudge.headline}
                  </h4>
                  {activeNudge.subheadline && (
                    <p className="text-[11px] text-[#6c7079] leading-tight line-clamp-1">
                      {activeNudge.subheadline}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDismiss(activeNudge)}
                  className="p-1 text-[#8a909a] hover:text-[#14293a] transition-colors cursor-pointer shrink-0"
                  aria-label="Dismiss nudge"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1-Tap CTA */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handlePrimaryCtaClick}
                  className="w-full py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {actionFeedback ? (
                    <span className="font-mono text-emerald-300">{actionFeedback}</span>
                  ) : (
                    <>
                      <span>{activeNudge.primary_cta?.text || 'Copy Code & Shop'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Desktop Floating Corner Pill / Card */}
          <aside
            aria-label="Promotional Nudge"
            className="hidden sm:block fixed bottom-5 right-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] bg-white text-[#14293a] border border-[#d3d6db] rounded-sm shadow-2xl overflow-hidden font-sans animate-in slide-in-from-bottom-5 duration-300"
          >
            {/* Top Bar */}
            <div className="px-3.5 py-1.5 bg-[#f8f9fa] border-b border-[#e5e7eb] flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-[#b91c1c] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#b91c1c]" />
                <span>{activeNudge.badge_text || 'LIMITED PRIVILEGE'}</span>
              </span>
              <button
                type="button"
                onClick={() => handleDismiss(activeNudge)}
                className="text-[#8a909a] hover:text-[#14293a] p-0.5 rounded-xs transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Thumbnail Image if available */}
            {activeNudge.banner_image_url && (
              <div className="relative h-24 w-full bg-[#f8f9fa] overflow-hidden">
                <Image
                  src={activeNudge.banner_image_url}
                  alt={activeNudge.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content Body */}
            <div className="p-4 space-y-2.5">
              <div>
                <h4 className="font-bold text-sm text-[#14293a] leading-tight">
                  {activeNudge.headline}
                </h4>
                {activeNudge.subheadline && (
                  <p className="text-xs text-[#6c7079] mt-1 leading-relaxed line-clamp-2">
                    {activeNudge.subheadline}
                  </p>
                )}
              </div>

              {/* Coupon Code Inline Pill */}
              {activeNudge.primary_cta?.coupon_code && (
                <div className="flex items-center justify-between p-2 bg-[#f8f9fa] border border-dashed border-[#d3d6db] rounded-xs text-xs font-mono">
                  <span className="text-neutral-500 font-bold text-[10px]">PROMO CODE:</span>
                  <span className="font-bold text-[#14293a] tracking-wider">
                    {activeNudge.primary_cta.coupon_code}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrimaryCtaClick}
                  className="flex-1 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionFeedback ? (
                    <span className="font-mono text-emerald-300 font-bold">{actionFeedback}</span>
                  ) : (
                    <>
                      <span>{activeNudge.primary_cta?.text || 'Copy Code & Shop'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>

                {activeNudge.secondary_cta && (
                  <button
                    type="button"
                    onClick={handleSecondaryCtaClick}
                    className="px-3 py-2 text-xs text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer"
                  >
                    {activeNudge.secondary_cta.text}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ============================================================== */}
      {/* TIER C: CENTER MODAL (QUARANTINED FOR EXIT INTENT / ONBOARDING)  */}
      {/* STRICTLY BLOCKED FOR GENERIC SALES PROMOTIONS                  */}
      {/* ============================================================== */}
      {surfaceTier === 'center_modal' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleDismiss(activeNudge)
          }}
        >
          <div className="bg-white text-[#14293a] border border-[#d3d6db] rounded-sm max-w-md w-full overflow-hidden relative shadow-2xl my-8 font-sans animate-in zoom-in-95 duration-200">
            <button
              onClick={() => handleDismiss(activeNudge)}
              className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {activeNudge.banner_image_url && (
              <div className="relative h-44 sm:h-48 w-full bg-[#f8f9fa] overflow-hidden">
                <Image
                  src={activeNudge.banner_image_url}
                  alt={activeNudge.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div className="p-6 sm:p-7 space-y-4">
              <div className="space-y-1.5">
                {activeNudge.badge_text && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#b91c1c] font-bold block">
                    {activeNudge.badge_text}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-bold text-[#14293a] leading-tight">
                  {activeNudge.headline}
                </h3>
                {activeNudge.subheadline && (
                  <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
                    {activeNudge.subheadline}
                  </p>
                )}
              </div>

              {activeNudge.primary_cta?.coupon_code && (
                <div className="p-3 bg-[#f8f9fa] border border-dashed border-[#d3d6db] rounded-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#6c7079] font-mono font-bold block">
                      COUPON CODE
                    </span>
                    <span className="font-mono font-bold text-sm text-[#14293a] tracking-wider">
                      {activeNudge.primary_cta.coupon_code}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#166534]">
                    {actionFeedback || 'Active in Cart'}
                  </span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePrimaryCtaClick}
                  className="w-full py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{actionFeedback || activeNudge.primary_cta?.text || 'Continue'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {activeNudge.secondary_cta && (
                  <button
                    type="button"
                    onClick={handleSecondaryCtaClick}
                    className="w-full py-1.5 text-xs text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer text-center font-medium"
                  >
                    {activeNudge.secondary_cta.text}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Clean wrapper component with Next.js <Suspense> boundary.
 * Guarantees zero SSR/hydration mismatches and prevents production build failures
 * when evaluating client-side searchParams and route context.
 */
export function UniversalPopupEngine() {
  return (
    <Suspense fallback={null}>
      <UniversalNudgeOrchestratorContent />
    </Suspense>
  )
}
