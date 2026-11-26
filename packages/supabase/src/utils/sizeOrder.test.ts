import { describe, it, expect } from 'vitest'
import { compareSizeLabels, sortSizes, sortVariantsBySize } from './sizeOrder'

describe('Deterministic Apparel Size Ordering', () => {
  it('orders reversed standard apparel sizes from XXS to 4XL', () => {
    expect(sortSizes(['L', 'M', 'S', 'XL', 'XS', 'XXL', 'XXS', '3XL'])).toEqual([
      'XXS',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
      '3XL',
    ])
  })

  it('orders numeric waist and chest sizes ascending after alpha sizes', () => {
    expect(sortSizes(['36', '30', '34', '32', '28'])).toEqual(['28', '30', '32', '34', '36'])
    expect(sortSizes(['32', 'M', '30', 'S'])).toEqual(['S', 'M', '30', '32'])
  })

  it('extracts base size from parenthetical colorway tags and sorts variants', () => {
    const variants = [
      { id: '1', size: 'XL (Black)' },
      { id: '2', size: 'S (Black)' },
      { id: '3', size: 'L (Black)' },
      { id: '4', size: 'M (Black)' },
    ]
    expect(sortVariantsBySize(variants).map((v) => v.size)).toEqual([
      'S (Black)',
      'M (Black)',
      'L (Black)',
      'XL (Black)',
    ])
  })

  it('places Taille and Standard/One Size variants predictably', () => {
    expect(sortSizes(['Standard', 'L', 'Taille 02 (L/XL)', 'Taille 01 (S/M)', 'S'])).toEqual([
      'S',
      'L',
      'Taille 01 (S/M)',
      'Taille 02 (L/XL)',
      'Standard',
    ])
    expect(compareSizeLabels('2XL', 'XL')).toBeGreaterThan(0)
  })
})
