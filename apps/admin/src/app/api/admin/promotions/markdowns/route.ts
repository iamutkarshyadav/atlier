import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data: schedules, error } = await supabase
      .from('price_schedules')
      .select(`
        *,
        product:products(id, title, price, cost_price),
        variant:product_variants(id, sku, size)
      `)
      .order('starts_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ schedules: schedules || [] }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to list markdown schedules' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      product_id,
      variant_id = null,
      promotional_price,
      scheduled_price,
      original_price = 0,
      starts_at,
      ends_at = null,
      campaign_name,
      reason,
      is_active = true,
    } = body

    const targetPrice = scheduled_price !== undefined ? scheduled_price : promotional_price

    if (!product_id || targetPrice === undefined || !starts_at) {
      return NextResponse.json(
        { error: 'product_id, scheduled_price, and starts_at are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Fetch original product price if not supplied
    let actualOriginalPrice = Number(original_price)
    if (!actualOriginalPrice) {
      const { data: prod } = await supabase
        .from('products')
        .select('price')
        .eq('id', product_id)
        .single()
      actualOriginalPrice = prod?.price || 0
    }

    const defaultEndDate = ends_at
      ? new Date(ends_at).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('price_schedules')
      .insert({
        product_id,
        variant_id,
        original_price: actualOriginalPrice,
        scheduled_price: Number(targetPrice),
        starts_at: new Date(starts_at).toISOString(),
        ends_at: defaultEndDate,
        reason: reason || campaign_name || 'Promotional Markdown',
        is_active,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await triggerStorefrontRevalidation({ path: `/product/${product_id}` }).catch(() => {})
    await triggerStorefrontRevalidation({ path: '/shop' }).catch(() => {})

    return NextResponse.json({ success: true, schedule: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to schedule markdown' },
      { status: 500 }
    )
  }
}
