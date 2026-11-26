import type { PopupCampaign, PopupSurfaceTier, PopupTrigger } from '../types/popups'

export interface NudgeContext {
  pathname: string
  searchParams?: Record<string, string>
  categoryId?: string
  productId?: string
  cartItemCount: number
  cartSubtotal: number
  scrollDepthPct?: number
  isExitIntent?: boolean
  isPdpEligible?: boolean
}

export interface NudgeSessionState {
  dismissedPopupIds: string[]
  lastDismissedAt: number | null // epoch ms
  modalShownInSession: boolean
  nudgesShownOnCurrentRoute: string[]
}

export const GLOBAL_DISMISS_COOLDOWN_SECONDS = 90
export const MIN_ENTRY_DELAY_SECONDS = 4

/**
 * Deterministically calculate priority score for a popup campaign:
 * 1. Contextual route / entity match: +80 to +100
 * 2. Expiring flash urgency (<24h remaining): +50
 * 3. Surface Tier adjustment (Tier B preferred for promos, Tier C strictly quarantined)
 * 4. Base priority_rank
 */
export function scoreNudgePriority(campaign: PopupCampaign, context: NudgeContext): number {
  let score = campaign.priority_rank ?? 10

  // 1. Contextual specificity (not a generic catch-all)
  const hasSpecificTargetPages =
    campaign.target_pages && campaign.target_pages.some((p) => p !== '*' && p !== 'all')
  if (hasSpecificTargetPages) {
    score += 80
  }

  // Specific route parameter match (e.g. /shop?category=...)
  if (context.searchParams && Object.keys(context.searchParams).length > 0) {
    const matchesParam = campaign.target_pages?.some((p) => p.includes('?'))
    if (matchesParam) {
      score += 20
    }
  }

  // 2. Expiring flash urgency
  if (campaign.end_at) {
    const msRemaining = new Date(campaign.end_at).getTime() - Date.now()
    if (msRemaining > 0 && msRemaining <= 24 * 60 * 60 * 1000) {
      score += 50
    }
  }

  // 3. Surface Tier adjustment
  const surfaceTier: PopupSurfaceTier =
    campaign.surface_tier || (campaign.position === 'center_modal' ? 'center_modal' : 'bottom_sheet')

  if (surfaceTier === 'bottom_sheet' || surfaceTier === 'floating_pill') {
    // Non-blocking Tier B is prioritized for promotional campaigns
    score += 20
  } else if (surfaceTier === 'center_modal') {
    // Quarantined Tier C modal: only permitted if cart has items on exit intent
    if (context.cartItemCount > 0 && campaign.trigger === 'exit_intent') {
      score += 30
    } else if (campaign.type === 'sale') {
      // Center modals for sales are de-prioritized / suppressed
      score -= 50
    }
  }

  return score
}

/**
 * Check if the global dismissal cooldown is active.
 * Enforces a strict 90s gap between any dismissed nudge and the next visible nudge.
 */
export function isGlobalCooldownActive(
  sessionState: NudgeSessionState,
  cooldownSeconds = GLOBAL_DISMISS_COOLDOWN_SECONDS,
  nowMs = Date.now()
): boolean {
  if (!sessionState.lastDismissedAt) return false
  const elapsedSeconds = (nowMs - sessionState.lastDismissedAt) / 1000
  return elapsedSeconds < cooldownSeconds
}

/**
 * Evaluate if a campaign passes all collision, cooldown, and frequency rules.
 */
export function isNudgeAllowedByFrequency(
  campaign: PopupCampaign,
  sessionState: NudgeSessionState,
  context: NudgeContext
): boolean {
  const surfaceTier: PopupSurfaceTier =
    campaign.surface_tier || (campaign.position === 'center_modal' ? 'center_modal' : 'bottom_sheet')

  // Rule 1: Center Modal Quarantined — max 1 center modal per session
  if (surfaceTier === 'center_modal') {
    if (sessionState.modalShownInSession) return false
    // If exit intent modal, only allow when user has items in cart
    if (campaign.trigger === 'exit_intent' && context.cartItemCount <= 0) return false
    // Never allow center modal for sales promotions (must be Tier B bottom sheet)
    if (campaign.type === 'sale' && campaign.trigger !== 'exit_intent') return false
  }

  // Rule 2: Max 1 contextual nudge per route transition
  if (sessionState.nudgesShownOnCurrentRoute.includes(campaign.id)) {
    return false
  }

  // Rule 3: Frequency capping (once_per_session)
  if (campaign.frequency === 'once_per_session' && sessionState.dismissedPopupIds.includes(campaign.id)) {
    return false
  }

  // Rule 4: Global dismissal cooldown (90 seconds)
  if (isGlobalCooldownActive(sessionState)) {
    return false
  }

  return true
}

/**
 * Check if a candidate's lifecycle trigger condition is satisfied.
 */
export function evaluateLifecycleTrigger(campaign: PopupCampaign, context: NudgeContext): boolean {
  const trigger = campaign.trigger

  if (trigger === 'immediate' || trigger === 'delay') {
    return true
  }

  if (trigger === 'scroll' || trigger === 'landing_scroll') {
    const requiredPct = trigger === 'landing_scroll' ? 40 : (campaign.trigger_scroll_percentage ?? 40)
    return (context.scrollDepthPct ?? 0) >= requiredPct
  }

  if (trigger === 'eligible_pdp_view') {
    return Boolean(context.isPdpEligible)
  }

  if (trigger === 'cart_threshold_near') {
    return context.cartItemCount > 0 && context.cartSubtotal > 0
  }

  if (trigger === 'exit_intent') {
    return Boolean(context.isExitIntent)
  }

  return false
}

/**
 * Single-Slot Mutex Lock:
 * From a pool of active candidate campaigns, select the single highest-priority winner
 * that passes all frequency, cooldown, and lifecycle trigger rules.
 */
export function selectWinningNudge(
  campaigns: PopupCampaign[],
  context: NudgeContext,
  sessionState: NudgeSessionState
): { winner: PopupCampaign | null; score: number } {
  // Global cooldown blocks everything
  if (isGlobalCooldownActive(sessionState)) {
    return { winner: null, score: 0 }
  }

  const eligibleCandidates = campaigns.filter((c) => {
    if (!c.is_active) return false
    if (!isNudgeAllowedByFrequency(c, sessionState, context)) return false
    if (!evaluateLifecycleTrigger(c, context)) return false
    return true
  })

  if (eligibleCandidates.length === 0) {
    return { winner: null, score: 0 }
  }

  // Sort by deterministic priority score
  const scored = eligibleCandidates.map((c) => ({
    campaign: c,
    score: scoreNudgePriority(c, context),
  }))

  scored.sort((a, b) => b.score - a.score)

  return {
    winner: scored[0]?.campaign ?? null,
    score: scored[0]?.score ?? 0,
  }
}
