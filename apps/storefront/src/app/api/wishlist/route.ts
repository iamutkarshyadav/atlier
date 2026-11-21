import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    const { data, error } = await (supabase as any)
      .from('wishlist_items')
      .select('id, product_id, created_at, products(*, categories(id, name, slug))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[GET /api/wishlist] Supabase warning (falling back to local):', error.message)
      return NextResponse.json({ items: [] }, { status: 200 })
    }

    // Map rows to a clean products array with wishlist metadata
    const items = (data || [])
      .map((row: any) => {
        if (!row.products) return null
        return {
          ...row.products,
          wishlist_item_id: row.id,
          wishlisted_at: row.created_at,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ items }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
    const productId = body.productId?.trim()

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('wishlist_items')
      .upsert(
        {
          user_id: user.id,
          product_id: productId,
        },
        { onConflict: 'user_id,product_id' }
      )
      .select()
      .maybeSingle()

    if (error) {
      console.warn('[POST /api/wishlist] Supabase warning (falling back to local):', error.message)
      return NextResponse.json({ success: true, item: { product_id: productId, user_id: user.id } }, { status: 200 })
    }

    return NextResponse.json({ success: true, item: data }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const url = new URL(req.url)
    let productId = url.searchParams.get('productId')?.trim()

    if (!productId) {
      try {
        const body = await req.json()
        productId = body.productId?.trim()
      } catch {
        // no body
      }
    }

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const { error } = await (supabase as any)
      .from('wishlist_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)

    if (error) {
      console.warn('[DELETE /api/wishlist] Supabase warning (falling back to local):', error.message)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
