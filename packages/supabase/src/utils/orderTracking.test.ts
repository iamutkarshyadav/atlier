import { describe, expect, it } from 'vitest'
import {
  buildOrderReferenceOrFilter,
  deriveCourierVerificationPin,
  formatIstTimestamp,
  isUuidString,
  maskShippingAddress,
} from './orderTracking'

describe('orderTracking utilities', () => {
  it('validates UUIDs strictly and builds safe PostgREST filters', () => {
    expect(isUuidString('b1000000-0000-0000-0000-000000000001')).toBe(true)
    expect(isUuidString('ATL-7ADX2')).toBe(false)
    expect(isUuidString('ATL-TRK-9821')).toBe(false)

    expect(buildOrderReferenceOrFilter('ATL-7ADX2')).toBe(
      'order_number.eq.ATL-7ADX2,tracking_barcode.eq.ATL-7ADX2'
    )
    expect(buildOrderReferenceOrFilter('b1000000-0000-0000-0000-000000000001')).toContain(
      'id.eq.b1000000-0000-0000-0000-000000000001,'
    )
  })

  it('masks sensitive street address and patron phone/email tags', () => {
    const masked = maskShippingAddress(
      '42 Indiranagar 100ft Rd, Apt 4B, Bengaluru, Karnataka 560038, India [Patron: a@b.com | Tel: 9999999999]'
    )
    expect(masked).not.toContain('42 Indiranagar')
    expect(masked).not.toContain('9999999999')
    expect(masked).not.toContain('a@b.com')
    expect(masked).toContain('Bengaluru')
  })

  it('produces deterministic 4-digit courier verification PINs and IST timestamps', () => {
    const pin = deriveCourierVerificationPin('ATL-7ADX2')
    expect(pin).toMatch(/^\d{4}$/)
    expect(deriveCourierVerificationPin('ATL-7ADX2')).toBe(pin)

    expect(formatIstTimestamp('2026-11-26T10:00:00Z')).toContain('26 Nov 2026')
    expect(formatIstTimestamp(null)).toBe('Pending')
  })
})
