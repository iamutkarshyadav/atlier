import { describe, expect, it, vi } from 'vitest'
import { createOrderWithItems } from './index'

function createMockSupabase(options: {
  orderRow?: Record<string, any> | null
  orderError?: { message: string } | null
  variantBySizeId?: string | null
  fallbackVariantId?: string | null
  itemsInsertError?: { message: string } | null
}) {
  const insertedOrderItems: any[] = []

  const client: any = {
    _insertedOrderItems: insertedOrderItems,
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: options.orderRow ?? { id: 'order-1', order_number: 'ORD-1001', total: 99 },
                error: options.orderError ?? null,
              })),
            })),
          })),
        }
      }

      if (table === 'product_variants') {
        return {
          select: vi.fn(() => {
            let sizeFilter = false
            const chain: any = {
              eq: vi.fn((col: string) => {
                if (col === 'size') sizeFilter = true
                return chain
              }),
              limit: vi.fn(() => chain),
              maybeSingle: vi.fn(async () => ({
                data: sizeFilter
                  ? options.variantBySizeId
                    ? { id: options.variantBySizeId }
                    : null
                  : options.fallbackVariantId
                  ? { id: options.fallbackVariantId }
                  : null,
              })),
              single: vi.fn(async () => ({
                data: { id: options.variantBySizeId || options.fallbackVariantId || 'var-1', stock: 10 },
              })),
            }
            return chain
          }),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: null, error: null })),
          })),
        }
      }

      if (table === 'order_items') {
        return {
          insert: vi.fn(async (rows: any[]) => {
            insertedOrderItems.push(...rows)
            return { error: options.itemsInsertError ?? null }
          }),
        }
      }

      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null })) })) })),
      }
    }),
  }

  return client
}

describe('createOrderWithItems', () => {
  it('populates variant_id directly when passed in order items', async () => {
    const supabase = createMockSupabase({})

    const res = await createOrderWithItems(
      supabase,
      { user_id: 'user-1', order_number: 'ORD-1001', total: 99 } as any,
      [
        {
          productId: 'prod-1',
          variantId: 'var-explicit',
          quantity: 1,
          unitPrice: 12345,
          discountAmount: 1000,
          originalUnitPrice: 12345,
          finalUnitPrice: 11345,
          size: 'L',
        },
      ]
    )

    expect(res.data).toBeTruthy()
    expect(supabase._insertedOrderItems).toHaveLength(1)
    expect(supabase._insertedOrderItems[0]).toMatchObject({
      order_id: 'order-1',
      product_id: 'prod-1',
      variant_id: 'var-explicit',
      unit_price: 12345,
      original_unit_price: 12345,
      discount_amount: 1000,
      final_unit_price: 11345,
      try_on_decision: 'pending',
    })
  })

  it('resolves variant_id by (product_id, size) when omitted', async () => {
    const supabase = createMockSupabase({ variantBySizeId: 'var-matched-size' })

    const res = await createOrderWithItems(
      supabase,
      { user_id: 'user-1', order_number: 'ORD-1002', total: 240 } as any,
      [
        {
          productId: 'prod-2',
          quantity: 2,
          unitPrice: 240,
          size: 'M',
        },
      ]
    )

    expect(res.data).toBeTruthy()
    expect(supabase._insertedOrderItems[0].variant_id).toBe('var-matched-size')
  })

  it('returns an explicit error if no variant exists for an order item', async () => {
    const supabase = createMockSupabase({ variantBySizeId: null, fallbackVariantId: null })

    const res = await createOrderWithItems(
      supabase,
      { user_id: 'user-1', order_number: 'ORD-1003', total: 165 } as any,
      [
        {
          productId: 'prod-missing',
          quantity: 1,
          unitPrice: 165,
        },
      ]
    )

    expect(res.data).toBeNull()
    expect(res.error).toContain('Missing variant_id')
  })
})
