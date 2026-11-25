export type PopupType = 'sale' | 'feature' | 'review' | 'custom'
export type PopupTrigger = 'immediate' | 'delay' | 'scroll' | 'exit_intent'
export type PopupFrequency = 'always' | 'once_per_session' | 'once_per_user'
export type PopupPosition = 'center_modal' | 'bottom_right' | 'bottom_bar' | 'top_banner'

export interface PopupCta {
  text: string
  link?: string
  action?: 'navigate' | 'copy_code' | 'open_review' | 'dismiss'
  coupon_code?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

export interface PopupCampaign {
  id: string
  title: string
  headline: string
  subheadline?: string
  content?: string
  badge_text?: string
  type: PopupType
  is_active: boolean
  banner_image_url?: string
  bg_color?: string
  text_color?: string
  position: PopupPosition
  trigger: PopupTrigger
  trigger_delay_seconds: number // for delay trigger
  trigger_scroll_percentage: number // for scroll trigger
  target_pages: string[] // e.g. ['*'] or ['/', '/orders', '/products/*']
  frequency: PopupFrequency
  start_at?: string | null
  end_at?: string | null
  primary_cta?: PopupCta
  secondary_cta?: PopupCta
  impression_count?: number
  click_count?: number
  created_at: string
  updated_at: string
}
