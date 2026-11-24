import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = createServiceRoleClient()

    const { data: promotion, error } = await supabase
      .from('promotions')
      .select(`
        *,
        rules:promotion_rules(*),
        coupons:promotion_coupons(*),
        redemptions:promotion_redemptions(
          id,
          order_id,
          customer_email,
          discount_applied,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error || !promotion) {
      return NextResponse.json(
        { error: error?.message || 'Promotion not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ promotion }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch promotion' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const supabase = createServiceRoleClient()

    const { data: updated, error } = await supabase
      .from('promotions')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await triggerStorefrontRevalidation({ path: '/' }).catch(() => {})
    await triggerStorefrontRevalidation({ path: '/shop' }).catch(() => {})

    return NextResponse.json({ success: true, promotion: updated }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to update promotion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('promotions').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await triggerStorefrontRevalidation({ path: '/' }).catch(() => {})

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete promotion' },
      { status: 500 }
    )
  }
}
