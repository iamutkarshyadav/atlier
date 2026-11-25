import { describe, it, expect } from 'vitest'
import {
  matchesPagePattern,
  getStorefrontPopups,
  saveStorefrontPopup,
  deleteStorefrontPopup,
  recordPopupAnalytics,
  DEFAULT_POPUPS,
} from './popups'

describe('Popups Utility & Matching Engine', () => {
  it('correctly matches wildcard and exact patterns', () => {
    expect(matchesPagePattern('/', ['*'])).toBe(true)
    expect(matchesPagePattern('/shop', ['*'])).toBe(true)
    expect(matchesPagePattern('/orders', ['/orders'])).toBe(true)
    expect(matchesPagePattern('/orders/123', ['/orders'])).toBe(false)
    expect(matchesPagePattern('/orders/123', ['/orders/*'])).toBe(true)
    expect(matchesPagePattern('/products/velvet-blazer', ['/products/*'])).toBe(true)
    expect(matchesPagePattern('/about', ['/products/*'])).toBe(false)
  })

  it('retrieves default popups when database has no entry', async () => {
    const popups = await getStorefrontPopups(null)
    expect(popups.length).toBeGreaterThanOrEqual(3)
    const flashSale = popups.find((p) => p.id === 'popup_flash_sale_curator')
    expect(flashSale).toBeDefined()
    expect(flashSale?.headline).toContain('Unlock ₹2,500 Off')
  })

  it('filters active popups by pathname', async () => {
    const ordersPopups = await getStorefrontPopups(null, { pathname: '/orders' })
    const hasDeliveredPrompt = ordersPopups.some((p) => p.id === 'popup_review_delivered_orders')
    expect(hasDeliveredPrompt).toBe(true)
  })

  it('saves and updates a custom popup campaign', async () => {
    const newPopup = {
      title: 'Spring Drop Preview',
      headline: 'Early Access to Spring 2026',
      type: 'feature' as const,
      is_active: true,
      target_pages: ['/shop'],
    }

    const res = await saveStorefrontPopup(null, newPopup)
    expect(res.success).toBe(true)
    expect(res.popup?.id).toBeDefined()
    expect(res.popup?.headline).toBe('Early Access to Spring 2026')

    // Track click
    if (res.popup) {
      await recordPopupAnalytics(null, res.popup.id, 'click')
      const popups = await getStorefrontPopups(null)
      const found = popups.find((p) => p.id === res.popup?.id)
      expect(found?.click_count).toBe(1)

      // Clean up
      await deleteStorefrontPopup(null, res.popup.id)
    }
  })
})
