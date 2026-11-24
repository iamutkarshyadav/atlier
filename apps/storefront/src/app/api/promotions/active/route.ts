import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const adminClient = createServiceRoleClient()
    const now = new Date().toISOString()

    // Only return public promotions (automatic cart discounts, tiered threshold banners, shipping waivers)
    // NEVER expose private VIP coupon codes!
    const { data: promotions, error } = await adminClient
      .from('promotions')
      .select(`
        id,
        name,
        slug,
        description,
        promotion_type,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_subtotal,
        is_stackable,
        starts_at,
        ends_at,
        priority
      `)
      .eq('is_active', true)
      .lte('starts_at', now)
      .neq('promotion_type', 'coupon')
      .order('priority', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const activeList = (promotions || []).filter(
      (p) => !p.ends_at || p.ends_at >= now
    )

    return NextResponse.json({ promotions: activeList }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch active promotions' },
      { status: 500 }
    )
  }
}
