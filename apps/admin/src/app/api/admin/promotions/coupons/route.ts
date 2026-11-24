import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const promotionId = searchParams.get('promotion_id')

    if (!promotionId) {
      return NextResponse.json(
        { error: 'promotion_id query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('promotion_coupons')
      .select('*')
      .eq('promotion_id', promotionId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ coupons: data || [] }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch coupons' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      promotion_id,
      code,
      prefix = 'VIP',
      count = 1,
      is_single_use = false,
      max_uses = null,
      assigned_customer_email = null,
    } = body

    if (!promotion_id) {
      return NextResponse.json(
        { error: 'promotion_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 1. Single Custom Code
    if (code && typeof code === 'string') {
      const cleanCode = code.trim().toUpperCase()
      const { data, error } = await supabase
        .from('promotion_coupons')
        .insert({
          promotion_id,
          code: cleanCode,
          is_single_use: is_single_use ?? (max_uses === 1),
          max_uses: max_uses || (is_single_use ? 1 : null),
          assigned_customer_email: assigned_customer_email ? assigned_customer_email.trim().toLowerCase() : null,
          is_active: true,
        })
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, coupon: data }, { status: 201 })
    }

    // 2. Bulk Generation
    const numToGenerate = Math.min(Math.max(1, count), 100) // Cap batch at 100
    const generatedCoupons = []

    for (let i = 0; i < numToGenerate; i++) {
      const randToken = crypto.randomBytes(3).toString('hex').toUpperCase()
      const bulkCode = `${prefix.toUpperCase()}-${randToken}`

      generatedCoupons.push({
        promotion_id,
        code: bulkCode,
        is_single_use: is_single_use ?? true,
        max_uses: is_single_use ? 1 : max_uses,
        assigned_customer_email: null,
        is_active: true,
      })
    }

    const { data: inserted, error: bulkError } = await supabase
      .from('promotion_coupons')
      .insert(generatedCoupons)
      .select('*')

    if (bulkError) {
      return NextResponse.json({ error: bulkError.message }, { status: 400 })
    }

    return NextResponse.json(
      { success: true, count: inserted?.length || 0, coupons: inserted },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate coupons' },
      { status: 500 }
    )
  }
}
