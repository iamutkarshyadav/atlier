import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getAdminReviews, type ReviewStatus } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const statusParam = searchParams.get('status')
    const ratingParam = searchParams.get('rating')
    const hasPhotosParam = searchParams.get('hasPhotos')
    const isBoltParam = searchParams.get('isBolt')
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const status = statusParam as ReviewStatus | 'all' | null
    const rating = ratingParam ? parseInt(ratingParam, 10) : undefined
    const hasPhotos = hasPhotosParam === 'true' ? true : undefined
    const isBolt = isBoltParam === 'true' ? true : isBoltParam === 'false' ? false : undefined

    const result = await getAdminReviews(supabase, {
      status: status || undefined,
      rating,
      hasPhotos,
      isBolt,
      search,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      reviews: result.reviews,
      total: result.total,
      pendingCount: result.pendingCount,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
