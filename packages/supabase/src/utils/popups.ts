import fs from 'fs'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import type { PopupCampaign } from '../types/popups'

const POPUPS_FILE = path.join(__dirname, '.local_popups.json')

export const DEFAULT_POPUPS: PopupCampaign[] = [
  {
    id: 'popup_flash_sale_curator',
    title: 'Curator Private Sale',
    headline: 'Unlock ₹2,500 Off Your Order',
    subheadline: 'Apply code CURATOR26 at checkout on orders exceeding ₹15,000.',
    content: 'Enjoy exclusive savings across all architectural silhouettes and seasonal staples.',
    badge_text: 'LIMITED TIME OFFER',
    type: 'sale',
    is_active: true,
    banner_image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80',
    position: 'center_modal',
    trigger: 'delay',
    trigger_delay_seconds: 4,
    trigger_scroll_percentage: 30,
    target_pages: ['*'],
    frequency: 'once_per_session',
    primary_cta: {
      text: 'Copy Code & Shop',
      action: 'copy_code',
      coupon_code: 'CURATOR26',
      link: '/shop',
      variant: 'primary',
    },
    secondary_cta: {
      text: 'Maybe Later',
      action: 'dismiss',
      variant: 'secondary',
    },
    impression_count: 0,
    click_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'popup_bolt_tryon_spotlight',
    title: 'Bolt 45-Min Doorstep Try-On',
    headline: 'Try Before You Buy in 45 Minutes',
    subheadline: 'Our dedicated courier brings up to 3 sizes directly to your door.',
    content: 'Try everything on in your home for 45 minutes for a nominal ₹99 hold. Keep what fits, return the rest on the spot.',
    badge_text: 'DOORSTEP CONCIERGE',
    type: 'feature',
    is_active: true,
    banner_image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
    position: 'bottom_right',
    trigger: 'scroll',
    trigger_delay_seconds: 3,
    trigger_scroll_percentage: 40,
    target_pages: ['/', '/shop', '/products/*'],
    frequency: 'once_per_session',
    primary_cta: {
      text: 'Explore Bolt Try-On',
      action: 'navigate',
      link: '/shop',
      variant: 'primary',
    },
    secondary_cta: {
      text: 'Dismiss',
      action: 'dismiss',
      variant: 'secondary',
    },
    impression_count: 0,
    click_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'popup_review_delivered_orders',
    title: 'Delivered Order Feedback',
    headline: 'How Did Your Recent Delivery Fit?',
    subheadline: 'Your delivered items are ready for review. Help fellow shoppers find their perfect size.',
    content: 'Share feedback on fabric drape, seam tailoring, and sizing accuracy directly in your orders dashboard.',
    badge_text: 'VERIFIED PURCHASE',
    type: 'review',
    is_active: true,
    banner_image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80',
    position: 'bottom_right',
    trigger: 'immediate',
    trigger_delay_seconds: 1,
    trigger_scroll_percentage: 0,
    target_pages: ['/orders'],
    frequency: 'always',
    primary_cta: {
      text: 'Review My Orders',
      action: 'navigate',
      link: '/orders',
      variant: 'primary',
    },
    secondary_cta: {
      text: 'Not Now',
      action: 'dismiss',
      variant: 'secondary',
    },
    impression_count: 0,
    click_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function readFallbackPopups(): PopupCampaign[] {
  try {
    if (fs.existsSync(POPUPS_FILE)) {
      const data = JSON.parse(fs.readFileSync(POPUPS_FILE, 'utf-8'))
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  return [...DEFAULT_POPUPS]
}

function writeFallbackPopups(popups: PopupCampaign[]): void {
  try {
    fs.writeFileSync(POPUPS_FILE, JSON.stringify(popups, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Failed to write local popups fallback:', err)
  }
}

/**
 * Checks if a pathname matches a set of target page patterns.
 * Supports '*' (all pages) and '/*' glob suffixes.
 */
export function matchesPagePattern(pathname: string, targetPages?: string[]): boolean {
  if (!targetPages || targetPages.length === 0) return true
  const normPath = pathname.split('?')[0].replace(/\/+$/, '') || '/'

  return targetPages.some((pattern) => {
    const trimmed = pattern.trim()
    if (trimmed === '*' || trimmed === 'all') return true
    if (trimmed.endsWith('/*')) {
      const prefix = trimmed.slice(0, -2).replace(/\/+$/, '')
      return normPath === prefix || normPath.startsWith(prefix + '/')
    }
    const cleanPattern = trimmed.replace(/\/+$/, '') || '/'
    return normPath === cleanPattern
  })
}

/**
 * Fetch all popups from `storefront_config` (key: 'popups').
 */
export async function getStorefrontPopups(
  supabase?: SupabaseClient<Database> | null,
  options?: { activeOnly?: boolean; pathname?: string }
): Promise<PopupCampaign[]> {
  let popups: PopupCampaign[] = []

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('storefront_config')
        .select('value')
        .eq('key', 'popups')
        .maybeSingle()

      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        popups = data.value as unknown as PopupCampaign[]
      }
    } catch {
      // Fallback
    }
  }

  if (popups.length === 0) {
    popups = readFallbackPopups()
  }

  const now = new Date()

  return popups.filter((item) => {
    if (options?.activeOnly) {
      if (!item.is_active) return false
      if (item.start_at && new Date(item.start_at) > now) return false
      if (item.end_at && new Date(item.end_at) < now) return false
    }

    if (options?.pathname) {
      if (!matchesPagePattern(options.pathname, item.target_pages)) return false
    }

    return true
  })
}

/**
 * Save or update a popup campaign in `storefront_config`.
 */
export async function saveStorefrontPopup(
  supabase: SupabaseClient<Database> | null | undefined,
  campaign: Partial<PopupCampaign> & { id?: string }
): Promise<{ success: boolean; popup?: PopupCampaign; error?: string }> {
  const currentPopups = await getStorefrontPopups(supabase, { activeOnly: false })
  const now = new Date().toISOString()

  let targetId = campaign.id
  let existingIndex = -1

  if (targetId) {
    existingIndex = currentPopups.findIndex((p) => p.id === targetId)
  } else {
    targetId = `popup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  }

  const updatedPopup: PopupCampaign = {
    id: targetId,
    title: campaign.title || 'Untitled Campaign',
    headline: campaign.headline || 'Exclusive Announcement',
    subheadline: campaign.subheadline || '',
    content: campaign.content || '',
    badge_text: campaign.badge_text || '',
    type: campaign.type || 'sale',
    is_active: campaign.is_active ?? true,
    banner_image_url: campaign.banner_image_url || '',
    bg_color: campaign.bg_color || '',
    text_color: campaign.text_color || '',
    position: campaign.position || 'center_modal',
    trigger: campaign.trigger || 'delay',
    trigger_delay_seconds: campaign.trigger_delay_seconds ?? 3,
    trigger_scroll_percentage: campaign.trigger_scroll_percentage ?? 30,
    target_pages: campaign.target_pages && campaign.target_pages.length > 0 ? campaign.target_pages : ['*'],
    frequency: campaign.frequency || 'once_per_session',
    start_at: campaign.start_at || null,
    end_at: campaign.end_at || null,
    primary_cta: campaign.primary_cta || { text: 'Shop Now', action: 'navigate', link: '/shop' },
    secondary_cta: campaign.secondary_cta,
    impression_count: existingIndex >= 0 ? currentPopups[existingIndex].impression_count || 0 : 0,
    click_count: existingIndex >= 0 ? currentPopups[existingIndex].click_count || 0 : 0,
    created_at: existingIndex >= 0 ? currentPopups[existingIndex].created_at : now,
    updated_at: now,
  }

  let updatedList: PopupCampaign[]
  if (existingIndex >= 0) {
    updatedList = [...currentPopups]
    updatedList[existingIndex] = updatedPopup
  } else {
    updatedList = [updatedPopup, ...currentPopups]
  }

  // Persist to fallback disk first
  writeFallbackPopups(updatedList)

  // Persist to Supabase storefront_config
  if (supabase) {
    try {
      const { error } = await supabase.from('storefront_config').upsert(
        {
          key: 'popups',
          value: updatedList as any,
          description: 'Storefront universal popup and banner campaigns',
          updated_at: now,
        },
        { onConflict: 'key' }
      )
      if (error) {
        return { success: true, popup: updatedPopup } // saved to fallback store
      }
    } catch {
      // Ignored, fallback succeeded
    }
  }

  return { success: true, popup: updatedPopup }
}

/**
 * Delete a popup campaign by ID.
 */
export async function deleteStorefrontPopup(
  supabase: SupabaseClient<Database> | null | undefined,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const currentPopups = await getStorefrontPopups(supabase, { activeOnly: false })
  const filtered = currentPopups.filter((p) => p.id !== id)

  writeFallbackPopups(filtered)

  if (supabase) {
    try {
      await supabase.from('storefront_config').upsert(
        {
          key: 'popups',
          value: filtered as any,
          description: 'Storefront universal popup and banner campaigns',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    } catch {}
  }

  return { success: true }
}

/**
 * Track an impression or CTA click for a popup campaign.
 */
export async function recordPopupAnalytics(
  supabase: SupabaseClient<Database> | null | undefined,
  id: string,
  event: 'impression' | 'click'
): Promise<void> {
  const currentPopups = await getStorefrontPopups(supabase, { activeOnly: false })
  const target = currentPopups.find((p) => p.id === id)
  if (!target) return

  if (event === 'impression') {
    target.impression_count = (target.impression_count || 0) + 1
  } else if (event === 'click') {
    target.click_count = (target.click_count || 0) + 1
  }

  writeFallbackPopups(currentPopups)

  if (supabase) {
    try {
      await supabase.from('storefront_config').upsert(
        {
          key: 'popups',
          value: currentPopups as any,
          description: 'Storefront universal popup and banner campaigns',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    } catch {}
  }
}
