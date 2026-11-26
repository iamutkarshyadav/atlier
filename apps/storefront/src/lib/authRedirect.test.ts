import { describe, expect, it } from 'vitest'
import { mapAuthErrorMessage, sanitizeAuthRedirect } from './authRedirect'

describe('sanitizeAuthRedirect', () => {
  it('allows relative internal storefront paths', () => {
    expect(sanitizeAuthRedirect('/checkout')).toBe('/checkout')
    expect(sanitizeAuthRedirect('/orders/ORD-123?tab=items')).toBe('/orders/ORD-123?tab=items')
    expect(sanitizeAuthRedirect('  /cart  ')).toBe('/cart')
  })

  it('rejects protocol-relative, external URLs, and backslash bypasses', () => {
    expect(sanitizeAuthRedirect('//evil.com')).toBe('/shop')
    expect(sanitizeAuthRedirect('https://evil.com/phish')).toBe('/shop')
    expect(sanitizeAuthRedirect('http://localhost:3000/admin')).toBe('/shop')
    expect(sanitizeAuthRedirect('/\\evil.com')).toBe('/shop')
    expect(sanitizeAuthRedirect('checkout')).toBe('/shop')
    expect(sanitizeAuthRedirect(null)).toBe('/shop')
  })
})

describe('mapAuthErrorMessage', () => {
  it('maps raw Supabase auth errors to helpful patron copy', () => {
    expect(mapAuthErrorMessage('Invalid login credentials')).toContain('Incorrect email address or password')
    expect(mapAuthErrorMessage('User already registered')).toContain('already exists')
    expect(mapAuthErrorMessage('Password should be at least 6 characters')).toContain('8 characters')
  })
})
