import { describe, it, expect } from 'vitest'
import {
  scoreNudgePriority,
  selectWinningNudge,
  isGlobalCooldownActive,
  isNudgeAllowedByFrequency,
  evaluateLifecycleTrigger,
  type NudgeContext,
  type NudgeSessionState,
} from './nudgeOrchestrator'
import type { PopupCampaign } from '../types/popups'

const baseContext: NudgeContext = {
  pathname: '/shop',
  cartItemCount: 2,
  cartSubtotal: 12000,
  scrollDepthPct: 45,
  isExitIntent: false,
}

const emptySessionState: NudgeSessionState = {
  dismissedPopupIds: [],
  lastDismissedAt: null,
  modalShownInSession: false,
  nudgesShownOnCurrentRoute: [],
}

const mockCampaignTierB: PopupCampaign = {
  id: 'promo_tier_b',
  title: 'Category Private Sale',
  headline: '15% Off Hoodies',
  type: 'sale',
  surface_tier: 'bottom_sheet',
  is_active: true,
  position: 'bottom_right',
  trigger: 'scroll',
  trigger_delay_seconds: 4,
  trigger_scroll_percentage: 40,
  target_pages: ['/shop*'],
  frequency: 'once_per_session',
  priority_rank: 20,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockCampaignGeneric: PopupCampaign = {
  id: 'promo_generic',
  title: 'Welcome Banner',
  headline: 'Welcome to Maison TG',
  type: 'sale',
  surface_tier: 'bottom_sheet',
  is_active: true,
  position: 'bottom_right',
  trigger: 'scroll',
  trigger_delay_seconds: 4,
  trigger_scroll_percentage: 40,
  target_pages: ['*'],
  frequency: 'always',
  priority_rank: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockCampaignModal: PopupCampaign = {
  id: 'promo_modal_exit',
  title: 'Exit Intent Cart Saver',
  headline: 'Complete Your Order & Save ₹500',
  type: 'sale',
  surface_tier: 'center_modal',
  is_active: true,
  position: 'center_modal',
  trigger: 'exit_intent',
  trigger_delay_seconds: 0,
  trigger_scroll_percentage: 0,
  target_pages: ['*'],
  frequency: 'once_per_session',
  priority_rank: 30,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('Nudge Orchestrator - Priority Scoring & Collision Engine', () => {
  it('awards higher priority score to contextual route targets over generic catch-all targets', () => {
    const contextualScore = scoreNudgePriority(mockCampaignTierB, baseContext)
    const genericScore = scoreNudgePriority(mockCampaignGeneric, baseContext)

    expect(contextualScore).toBeGreaterThan(genericScore)
    // Contextual adds +80
    expect(contextualScore - genericScore).toBeGreaterThanOrEqual(80)
  })

  it('boosts priority for expiring urgency (< 24 hours remaining)', () => {
    const expiringIn3Hours = new Date(Date.now() + 3 * 3600 * 1000).toISOString()
    const expiringCampaign: PopupCampaign = {
      ...mockCampaignTierB,
      end_at: expiringIn3Hours,
    }

    const regularScore = scoreNudgePriority(mockCampaignTierB, baseContext)
    const urgentScore = scoreNudgePriority(expiringCampaign, baseContext)

    expect(urgentScore - regularScore).toBe(50)
  })

  it('enforces single-slot mutex lock: picks single highest-scored winner among multiple candidates', () => {
    const result = selectWinningNudge(
      [mockCampaignGeneric, mockCampaignTierB],
      baseContext,
      emptySessionState
    )

    expect(result.winner).not.toBeNull()
    expect(result.winner?.id).toBe(mockCampaignTierB.id)
  })

  it('suppresses subsequent nudges during 90-second global dismissal cooldown', () => {
    const now = Date.now()
    const cooldownSession: NudgeSessionState = {
      ...emptySessionState,
      lastDismissedAt: now - 30 * 1000, // dismissed 30s ago
    }

    expect(isGlobalCooldownActive(cooldownSession, 90, now)).toBe(true)

    const result = selectWinningNudge([mockCampaignTierB], baseContext, cooldownSession)
    expect(result.winner).toBeNull()
  })

  it('permits nudges once the 90-second global dismissal cooldown has elapsed', () => {
    const now = Date.now()
    const expiredCooldownSession: NudgeSessionState = {
      ...emptySessionState,
      lastDismissedAt: now - 95 * 1000, // dismissed 95s ago
    }

    expect(isGlobalCooldownActive(expiredCooldownSession, 90, now)).toBe(false)

    const result = selectWinningNudge([mockCampaignTierB], baseContext, expiredCooldownSession)
    expect(result.winner?.id).toBe(mockCampaignTierB.id)
  })

  it('quarantines center modals: blocks center exit modal when cart is empty', () => {
    const emptyCartContext: NudgeContext = {
      ...baseContext,
      cartItemCount: 0,
      isExitIntent: true,
    }

    const allowed = isNudgeAllowedByFrequency(mockCampaignModal, emptySessionState, emptyCartContext)
    expect(allowed).toBe(false)
  })

  it('permits center exit modal when cart has items and modal has not been shown in session', () => {
    const exitContext: NudgeContext = {
      ...baseContext,
      cartItemCount: 2,
      isExitIntent: true,
    }

    const allowed = isNudgeAllowedByFrequency(mockCampaignModal, emptySessionState, exitContext)
    expect(allowed).toBe(true)
  })

  it('strictly caps center modals to max 1 per session', () => {
    const sessionWithModalShown: NudgeSessionState = {
      ...emptySessionState,
      modalShownInSession: true,
    }

    const exitContext: NudgeContext = {
      ...baseContext,
      cartItemCount: 2,
      isExitIntent: true,
    }

    const allowed = isNudgeAllowedByFrequency(mockCampaignModal, sessionWithModalShown, exitContext)
    expect(allowed).toBe(false)
  })

  it('evaluates scroll lifecycle triggers accurately (requires >= 40% scroll)', () => {
    expect(evaluateLifecycleTrigger(mockCampaignTierB, { ...baseContext, scrollDepthPct: 20 })).toBe(false)
    expect(evaluateLifecycleTrigger(mockCampaignTierB, { ...baseContext, scrollDepthPct: 40 })).toBe(true)
    expect(evaluateLifecycleTrigger(mockCampaignTierB, { ...baseContext, scrollDepthPct: 75 })).toBe(true)
  })

  it('evaluates eligible_pdp_view lifecycle trigger accurately', () => {
    const pdpCampaign: PopupCampaign = {
      ...mockCampaignTierB,
      id: 'pdp_exclusive',
      trigger: 'eligible_pdp_view',
    }

    expect(evaluateLifecycleTrigger(pdpCampaign, { ...baseContext, isPdpEligible: false })).toBe(false)
    expect(evaluateLifecycleTrigger(pdpCampaign, { ...baseContext, isPdpEligible: true })).toBe(true)
  })
})
