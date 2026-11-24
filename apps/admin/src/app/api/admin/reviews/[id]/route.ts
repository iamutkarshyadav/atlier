import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { updateProductReviewModeration, type ReviewStatus } from '@repo/supabase'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceRoleClient()
    const reviewId = params.id

    if (!reviewId) {
      return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, rejectionReason, adminReply, adminRepliedBy, moderatedBy } = body

    const result = await updateProductReviewModeration(supabase, reviewId, {
      status: status as ReviewStatus,
      rejectionReason,
      adminReply,
      adminRepliedBy,
      moderatedBy,
    })

    if (!result.success || !result.review) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update review' },
        { status: 400 }
      )
    }

    // Trigger ISR revalidation for the garment's PDP
    if (result.review.product_id) {
      triggerStorefrontRevalidation({ path: `/product/${result.review.product_id}` }).catch((err) =>
        console.warn('Storefront ISR purge failed for reviewed product:', err)
      )
    }

    return NextResponse.json({
      success: true,
      review: result.review,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error updating review' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceRoleClient()
    const reviewId = params.id

    if (!reviewId) {
      return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 })
    }

    // Fetch review to get product_id before deleting
    const { data: review } = await supabase
      .from('product_reviews')
      .select('product_id')
      .eq('id', reviewId)
      .single()

    const { error } = await supabase.from('product_reviews').delete().eq('id', reviewId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    if (review?.product_id) {
      triggerStorefrontRevalidation({ path: `/product/${review.product_id}` }).catch(() => {})
    }

    return NextResponse.json({ success: true, message: 'Review deleted successfully' })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error deleting review' },
      { status: 500 }
    )
  }
}
