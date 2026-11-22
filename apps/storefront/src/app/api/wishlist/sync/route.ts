import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

async function getWishlistProductIds(supabase: any, userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('storefront_config')
      .select('value')
      .eq('key', 'user_wishlists')
      .maybeSingle()
    if (data?.value && typeof data.value === 'object') {
      const list = data.value[userId]
      return Array.isArray(list) ? list : []
    }
  } catch {}
  return []
}

async function saveWishlistProductIds(supabase: any, userId: string, productIds: string[]) {
  try {
    const { data } = await supabase
      .from('storefront_config')
      .select('value')
      .eq('key', 'user_wishlists')
      .maybeSingle()
    const current = data?.value && typeof data.value === 'object' ? { ...data.value } : {}
    current[userId] = Array.from(new Set(productIds.filter(Boolean)))
    await supabase.from('storefront_config').upsert(
      {
        key: 'user_wishlists',
        value: current,
        description: 'Dynamic user wishlists config',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
  } catch {}
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
    const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : []

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 })
    }

    const validIds = productIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    const currentList = await getWishlistProductIds(supabase, user.id)
    const combined = Array.from(new Set([...currentList, ...validIds]))
    await saveWishlistProductIds(supabase, user.id, combined)

    return NextResponse.json({ success: true, count: combined.length }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
