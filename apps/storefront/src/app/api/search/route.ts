import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getCategories,
  getPromotions,
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  type Product,
  type Category,
  type PromotionWithRules,
} from '@repo/supabase/utils'
import { getEffectiveProductPricing, type ProductPricingSummary } from '@repo/supabase/pricing'

export const dynamic = 'force-dynamic'

const TRENDING_SEARCHES = [
  '480 GSM Hoodie',
  'Selvedge Denim',
  'Kurta Sets',
  'Flight Bomber',
  'Linen Tops',
]

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[%_,()]/g, ' ').trim().slice(0, 80)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get('q') || ''
    const q = sanitizeSearchTerm(rawQuery)
    const qLower = q.toLowerCase()

    let products: Product[] = []
    let categories: Category[] = DEFAULT_CATEGORIES
    let promotions: PromotionWithRules[] = []
    let priceSchedules: any[] = []

    try {
      const supabase = await createServerSupabaseClient()
      const nowIso = new Date().toISOString()

      let prodQuery = supabase
        .from('products')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (q) {
        prodQuery = prodQuery.or(
          `title.ilike.%${q}%,category.ilike.%${q}%,material.ilike.%${q}%,description.ilike.%${q}%`
        )
      }

      const [prodRes, catRes, promoRes, schedRes] = await Promise.all([
        prodQuery.limit(4),
        getCategories(supabase).catch(() => DEFAULT_CATEGORIES),
        getPromotions(supabase, { onlyActive: true }).catch(() => []),
        Promise.resolve(
          supabase
            .from('price_schedules')
            .select('*')
            .eq('is_active', true)
            .lte('starts_at', nowIso)
            .gte('ends_at', nowIso)
        ).catch(() => ({ data: [] })),
      ])

      if (prodRes.data && prodRes.data.length > 0) {
        products = prodRes.data.map((row: any) => ({
          ...row,
          price: Number(row.price),
          compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
        }))
      } else if (!q) {
        products = DEFAULT_PRODUCTS.slice(0, 4)
      }

      if (Array.isArray(catRes) && catRes.length > 0) {
        categories = catRes
      }
      if (Array.isArray(promoRes)) {
        promotions = promoRes
      }
      priceSchedules = schedRes?.data || []
    } catch {
      const fallbackPool = q
        ? DEFAULT_PRODUCTS.filter((p) => {
            return (
              p.title.toLowerCase().includes(qLower) ||
              (p.category || '').toLowerCase().includes(qLower) ||
              (p.material || '').toLowerCase().includes(qLower) ||
              (p.description || '').toLowerCase().includes(qLower)
            )
          })
        : DEFAULT_PRODUCTS
      products = fallbackPool.slice(0, 4)
    }

    // Filter matching categories
    const matchingCategories = (q
      ? categories.filter(
          (c) =>
            c.name.toLowerCase().includes(qLower) ||
            c.slug.toLowerCase().includes(qLower)
        )
      : categories.filter((c) => !c.parent_id)
    ).slice(0, 6)

    // Resolve live effective pricing for returned product cards
    const pricingMap: Record<string, ProductPricingSummary> = {}
    for (const product of products) {
      pricingMap[product.id] = getEffectiveProductPricing(product, promotions, priceSchedules)
    }

    return NextResponse.json({
      success: true,
      query: q,
      products,
      pricingMap,
      categories: matchingCategories,
      trending: TRENDING_SEARCHES,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Search failed',
        products: [],
        pricingMap: {},
        categories: [],
        trending: TRENDING_SEARCHES,
      },
      { status: 500 }
    )
  }
}
