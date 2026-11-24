import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { updatePatronReview, type FashionFitIndicator } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceRoleClient()

    // 1. Resolve authenticated user
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
      return NextResponse.json(
        { success: false, error: 'Authentication required to edit your review' },
        { status: 401 }
      )
    }

    const reviewId = params.id
    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { rating, title, comment, fitIndicator } = body

    const result = await updatePatronReview(serviceSupabase, reviewId, user.id, {
      rating: rating !== undefined ? Number(rating) : undefined,
      title: title !== undefined ? String(title) : undefined,
      comment: comment !== undefined ? String(comment) : undefined,
      fit_indicator: fitIndicator as FashionFitIndicator | undefined,
    })

    if (!result.success || !result.review) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update review' },
        { status: 400 }
      )
    }

    if (result.review.product_id) {
      try {
        revalidatePath(`/product/${result.review.product_id}`)
      } catch {}
    }

    return NextResponse.json({
      success: true,
      review: result.review,
      message: 'Your revised impressions have been saved and re-queued for moderation.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error editing review' },
      { status: 500 }
    )
  }
}
