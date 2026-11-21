import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : []

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 })
    }

    const rows = productIds
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
      .map((productId) => ({
        user_id: user.id,
        product_id: productId.trim(),
      }))

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 })
    }

    const { error } = await (supabase as any)
      .from('wishlist_items')
      .upsert(rows, { onConflict: 'user_id,product_id' })

    if (error) {
      console.warn('[POST /api/wishlist/sync] Supabase warning (falling back to local):', error.message)
      return NextResponse.json({ success: true, count: rows.length, fallback: true }, { status: 200 })
    }

    return NextResponse.json({ success: true, count: rows.length }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
