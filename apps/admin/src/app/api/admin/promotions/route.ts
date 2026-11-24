import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { createPromotionWithRules, getLocalPromotions } from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const supabase = createServiceRoleClient()

    let query = supabase
      .from('promotions')
      .select(`
        *,
        rules:promotion_rules(*),
        coupons:promotion_coupons(id, code, is_single_use, max_uses, times_used, is_active, assigned_customer_email),
        redemptions:promotion_redemptions(count)
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    if (type) {
      query = query.eq('promotion_type', type as any)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        const local = getLocalPromotions(status === 'active')
        return NextResponse.json({ promotions: local }, { status: 200 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ promotions: data || [] }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to list promotions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { promotion, rules = [], coupons = [] } = body

    if (!promotion || !promotion.name || !promotion.slug) {
      return NextResponse.json(
        { error: 'Promotion name and slug are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const result = await createPromotionWithRules(
      supabase,
      promotion,
      rules,
      coupons
    )

    if (!result.success || !result.promotion) {
      return NextResponse.json(
        { error: result.error || 'Failed to create promotion' },
        { status: 400 }
      )
    }

    // Trigger ISR revalidation on storefront so active banners/markdowns refresh
    await triggerStorefrontRevalidation({ path: '/' }).catch(() => {})
    await triggerStorefrontRevalidation({ path: '/shop' }).catch(() => {})

    return NextResponse.json(
      { success: true, promotion: result.promotion },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error creating promotion' },
      { status: 500 }
    )
  }
}
