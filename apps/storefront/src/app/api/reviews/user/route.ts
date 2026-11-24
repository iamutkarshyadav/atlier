import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { getLocalReviews } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceRoleClient()

    let user: any = null
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser()
    user = cookieUser

    if (!user) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.replace(/^bearer\s+/i, '').trim()
        if (token) {
          const {
            data: { user: tokenUser },
          } = await supabase.auth.getUser(token)
          user = tokenUser
        }
      }
    }

    if (!user) {
      return NextResponse.json({ success: true, reviewsByOrderItem: {} })
    }

    const { data: reviews, error } = await serviceSupabase
      .from('product_reviews')
      .select('id, product_id, order_id, order_item_id, rating, title, comment, fit_indicator, status, created_at')
      .eq('user_id', user.id)

    if (error || !reviews) {
      if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
        const local = getLocalReviews()
        const map: Record<string, any> = {}
        for (const rev of local) {
          if (rev.user_id === user.id) {
            map[rev.order_item_id] = rev
          }
        }
        return NextResponse.json({ success: true, reviewsByOrderItem: map })
      }
      return NextResponse.json({ success: true, reviewsByOrderItem: {} })
    }

    const map: Record<string, any> = {}
    for (const rev of reviews) {
      map[rev.order_item_id] = rev
    }

    return NextResponse.json({
      success: true,
      reviewsByOrderItem: map,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch user reviews' },
      { status: 500 }
    )
  }
}
