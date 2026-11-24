import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import {
  getProductReviews,
  getProductRatingSummary,
  checkUserReviewEligibility,
  createProductReview,
  type FashionFitIndicator,
} from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)

    const productId = searchParams.get('productId')
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId query parameter is required' },
        { status: 400 }
      )
    }

    const ratingParam = searchParams.get('rating')
    const fitParam = searchParams.get('fit')
    const hasPhotosParam = searchParams.get('hasPhotos')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined
    const fit = fitParam as FashionFitIndicator | undefined
    const hasPhotos = hasPhotosParam === 'true'

    const [reviewsResult, summary] = await Promise.all([
      getProductReviews(supabase, productId, {
        limit,
        offset,
        rating,
        fit,
        hasPhotos,
      }),
      getProductRatingSummary(supabase, productId),
    ])

    return NextResponse.json({
      success: true,
      reviews: reviewsResult.reviews,
      total: reviewsResult.total,
      summary,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
        { success: false, error: 'Authentication required to submit a review' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const {
      productId,
      orderId,
      orderItemId,
      rating,
      title,
      comment,
      fitIndicator,
      sizePurchased,
      isBoltTryOn,
      mediaUrls,
    } = body

    if (!productId || !orderId || !orderItemId || !rating || !title || !comment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required review fields (productId, orderId, orderItemId, rating, title, comment)',
        },
        { status: 400 }
      )
    }

    // 3. Strict Server-Side Verified Purchase Eligibility Enforcement
    const eligibility = await checkUserReviewEligibility(serviceSupabase, user.id, orderItemId)
    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, error: eligibility.reason || 'Not eligible to review this garment' },
        { status: 400 }
      )
    }

    // 4. Create review with status = 'pending'
    const result = await createProductReview(serviceSupabase, {
      productId,
      orderId,
      orderItemId,
      userId: user.id,
      rating: Number(rating),
      title: String(title),
      comment: String(comment),
      fitIndicator: fitIndicator || 'true_to_size',
      sizePurchased: sizePurchased || eligibility.orderItem?.size || null,
      isBoltTryOn: isBoltTryOn ?? eligibility.orderItem?.is_bolt ?? false,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    })

    if (!result.success || !result.review) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to submit review' },
        { status: 400 }
      )
    }

    // 5. Invalidate Next.js cache for the product page
    try {
      revalidatePath(`/product/${productId}`)
    } catch {
      // Ignore in non-ISR runtime
    }

    return NextResponse.json({
      success: true,
      review: result.review,
      message: 'Your impressions have been submitted and are pending editorial curation.',
    })
  } catch (err: any) {
    console.error('Exception submitting review:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error submitting review' },
      { status: 500 }
    )
  }
}
