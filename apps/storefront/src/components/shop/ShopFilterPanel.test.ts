import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_VARIANTS,
  type Product,
  type ProductVariant,
} from '@repo/supabase/utils'
import {
  extractVariantColorFacets,
  extractVariantSizeFacets,
  formatPriceRangeLabel,
  PRICE_BUCKETS,
  resolveColorHex,
} from './ShopFilterPanel'

function makeProduct(id: string): Product {
  return {
    ...DEFAULT_PRODUCTS[0]!,
    id,
    title: `Garment ${id}`,
  }
}

function makeVariant(
  id: string,
  productId: string,
  size: string,
  color: string | null,
  stock = 5
): ProductVariant {
  return {
    ...DEFAULT_PRODUCT_VARIANTS[0]!,
    id,
    product_id: productId,
    sku: `SKU-${id}`,
    size,
    color,
    stock,
  }
}

describe('ShopFilterPanel facet & price helpers', () => {
  it('derives and deterministically sorts size facets with stock status', () => {
    const products = [makeProduct('p1'), makeProduct('p2')]
    const variantsMap = {
      p1: [
        makeVariant('v1', 'p1', 'L', 'Black', 0),
        makeVariant('v2', 'p1', 'S', 'Black', 4),
        makeVariant('v3', 'p1', '32', 'Black', 2),
      ],
      p2: [
        makeVariant('v4', 'p2', 'M', 'Ecru', 3),
        makeVariant('v5', 'p2', 'L', 'Ecru', 0),
        makeVariant('v6', 'p2', '30', 'Ecru', 1),
      ],
    }

    const facets = extractVariantSizeFacets(products, variantsMap)
    expect(facets).toEqual([
      { size: 'S', inStock: true },
      { size: 'M', inStock: true },
      { size: 'L', inStock: false },
      { size: '30', inStock: true },
      { size: '32', inStock: true },
    ])
  })

  it('derives deduplicated color facets with counts across distinct products', () => {
    const products = [makeProduct('p1'), makeProduct('p2')]
    const variantsMap = {
      p1: [
        makeVariant('v1', 'p1', 'S', 'Vintage Black', 3),
        makeVariant('v2', 'p1', 'M', 'Vintage Black', 2),
        makeVariant('v3', 'p1', 'M', 'Natural Ecru', 1),
      ],
      p2: [makeVariant('v4', 'p2', 'L', 'Vintage Black', 5)],
    }

    const colors = extractVariantColorFacets(products, variantsMap)
    expect(colors).toEqual([
      { name: 'Vintage Black', hex: '#1C1C1C', count: 2 },
      { name: 'Natural Ecru', hex: '#F0EAE1', count: 1 },
    ])
  })

  it('resolves color swatches cleanly with neutral fallback', () => {
    expect(resolveColorHex('Raw Indigo')).toBe('#1B2A4A')
    expect(resolveColorHex('Deep Charcoal')).toBe('#374151')
    expect(resolveColorHex('Unknown Hue')).toBe('#9CA3AF')
  })

  it('formats standard price buckets and custom INR bounds', () => {
    expect(PRICE_BUCKETS).toHaveLength(4)
    expect(formatPriceRangeLabel(null, null)).toBeNull()
    expect(formatPriceRangeLabel(null, 2000)).toBe('Under ₹2,000')
    expect(formatPriceRangeLabel(2000, 5000)).toBe('₹2,000 – ₹5,000')
    expect(formatPriceRangeLabel(5000, 10000)).toBe('₹5,000 – ₹10,000')
    expect(formatPriceRangeLabel(10000, null)).toBe('Above ₹10,000')
    expect(formatPriceRangeLabel(1500, 4500)).toBe('₹1,500 – ₹4,500')
  })
})
