import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getPromotions,
  getStorefrontProducts,
  DEFAULT_PRODUCTS,
  getEffectiveProductPricing,
  calculateDiscountBuckets,
  type Product,
  type PromotionWithRules,
} from '@repo/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // 1. Fetch active promotions and active price schedules concurrently
    const [promotions, products, schedulesRes] = await Promise.all([
      getPromotions(supabase, { onlyActive: true }).catch(() => []),
      getStorefrontProducts(supabase, 'all').catch(() => DEFAULT_PRODUCTS),
      Promise.resolve(
        supabase
          .from('price_schedules')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', new Date().toISOString())
          .gte('ends_at', new Date().toISOString())
      ).catch(() => ({ data: [] })),
    ])

    const safeProducts: Product[] =
      Array.isArray(products) && products.length > 0 ? products : DEFAULT_PRODUCTS
    const safePromotions: PromotionWithRules[] = Array.isArray(promotions) ? promotions : []
    const priceSchedules: any[] = schedulesRes?.data || []

    // 2. Compute effective product pricing and discount buckets
    const pricingList = safeProducts.map((p) =>
      getEffectiveProductPricing(p, safePromotions, priceSchedules)
    )

    const pricingMap: Record<string, any> = {}
    pricingList.forEach((p) => {
      pricingMap[p.productId] = p
    })

    const discountBuckets = calculateDiscountBuckets(safeProducts, pricingList)

    // 3. Extract public campaigns & coupons (Strictly exclude private VIP single-use codes & cost_price)
    const publicCampaigns = safePromotions
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        bannerImageUrl: (p as any).banner_image_url || null,
        is_active: p.is_active,
        isActive: p.is_active,
        promotion_type: p.promotion_type,
        promotionType: p.promotion_type,
        discount_type: p.discount_type,
        discountType: p.discount_type,
        discount_value: Number(p.discount_value),
        discountValue: Number(p.discount_value),
        min_order_subtotal: p.min_order_subtotal ? Number(p.min_order_subtotal) : null,
        minOrderSubtotal: p.min_order_subtotal ? Number(p.min_order_subtotal) : null,
        max_discount_amount: p.max_discount_amount ? Number(p.max_discount_amount) : null,
        maxDiscountAmount: p.max_discount_amount ? Number(p.max_discount_amount) : null,
        isStackable: p.is_stackable,
        priority: p.priority,
        startsAt: p.starts_at,
        starts_at: p.starts_at,
        endsAt: p.ends_at,
        ends_at: p.ends_at,
        publicCoupons: (p.coupons || [])
          .filter(
            (c: any) =>
              c.is_active &&
              !c.is_single_use &&
              !c.assigned_customer_email &&
              (c.is_public === true || (c.is_public === undefined && !c.assigned_customer_email))
          )
          .map((c: any) => ({
            id: c.id,
            code: c.code,
            maxUses: c.max_uses,
          })),
        coupons: (p.coupons || []).filter(
          (c: any) =>
            c.is_active &&
            !c.is_single_use &&
            !c.assigned_customer_email &&
            (c.is_public === true || (c.is_public === undefined && !c.assigned_customer_email))
        ),
        rules: (p.rules || []).map((r) => ({
          target_type: r.target_type,
          targetType: r.target_type,
          match_operator: r.match_operator,
          matchOperator: r.match_operator,
          target_id: r.target_id,
          targetId: r.target_id,
        })),
      }))

    // Flatten all public coupons for quick discovery cards
    const publicCoupons = publicCampaigns.flatMap((camp) =>
      camp.publicCoupons.map((c) => ({
        code: c.code,
        promotionName: camp.name,
        description: camp.description,
        bannerImageUrl: camp.bannerImageUrl,
        discountType: camp.discountType,
        discountValue: camp.discountValue,
        minOrderSubtotal: camp.minOrderSubtotal,
        maxDiscountAmount: camp.maxDiscountAmount,
        endsAt: camp.endsAt,
        badgeText:
          camp.discountType === 'percentage'
            ? `${Math.round(camp.discountValue)}% OFF`
            : camp.discountType === 'free_shipping'
              ? 'FREE SHIPPING'
              : `₹${Math.round(camp.discountValue)} OFF`,
      }))
    )

    // 4. Featured high-priority promotion for announcement bar and welcome popup
    const featuredOffer = publicCampaigns.length > 0 ? publicCampaigns[0] : null

    return NextResponse.json({
      success: true,
      pricingMap,
      pricingList,
      campaigns: publicCampaigns,
      publicCoupons,
      discountBuckets,
      featuredOffer,
      totalPromotions: publicCampaigns.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Error fetching storefront offers:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load active offers' },
      { status: 500 }
    )
  }
}
