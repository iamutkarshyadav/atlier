import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { getUserEligibleReviewItemsForProduct } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const productId = new URL(req.url).searchParams.get('productId')
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceRoleClient()

    let user: { id: string } | null = null
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
      return NextResponse.json({
        success: true,
        authenticated: false,
        eligibleItems: [],
      })
    }

    const eligibleItems = await getUserEligibleReviewItemsForProduct(
      serviceSupabase,
      user.id,
      productId
    )

    return NextResponse.json({
      success: true,
      authenticated: true,
      eligibleItems,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to verify review eligibility' },
      { status: 500 }
    )
  }
}
