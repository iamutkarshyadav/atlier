import { describe, it, expect } from 'vitest'
import { encodeCode128B } from './barcode'

describe('Code 128B Barcode Engine (encodeCode128B)', () => {
  it('correctly calculates the modulo-103 checksum and module widths for a standard string', () => {
    // "TEST":
    // START_B (104)
    // T (ASCII 84 - 32 = 52) * 1 = 52
    // E (ASCII 69 - 32 = 37) * 2 = 74
    // S (ASCII 83 - 32 = 51) * 3 = 153
    // T (ASCII 84 - 32 = 52) * 4 = 208
    // Total = 104 + 487 = 591
    // 591 % 103 = 76
    const result = encodeCode128B('TEST')

    expect(result.checksum).toBe(76)
    expect(result.widths.length).toBeGreaterThan(0)
    expect(result.widths.reduce((acc, curr) => acc + curr, 0)).toBe(result.totalModules)
  })

  it('correctly computes checksum for an Atelier tracking number', () => {
    const result = encodeCode128B('ATL-TRK-001')

    expect(result.checksum).toBe(27)
    expect(result.checksum).toBeGreaterThanOrEqual(0)
    expect(result.checksum).toBeLessThan(103)
    expect(result.totalModules).toBeGreaterThan(0)
  })
})

