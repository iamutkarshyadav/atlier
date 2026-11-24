import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const [
      { count: pendingCount },
      { count: approvedCount },
      { count: rejectedCount },
      { count: totalReviews },
      { count: lowRatingCount },
      { data: avgData },
      { count: photosCount },
    ] = await Promise.all([
      supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase
        .from('product_reviews')
        .select('id', { count: 'exact', head: true })
        .in('status', ['rejected', 'hidden']),
      supabase.from('product_reviews').select('id', { count: 'exact', head: true }),
      supabase.from('product_reviews').select('id', { count: 'exact', head: true }).lte('rating', 2),
      supabase.from('product_reviews').select('rating').eq('status', 'approved'),
      supabase.from('review_media').select('id', { count: 'exact', head: true }),
    ])

    let averageRating = 0
    if (avgData && avgData.length > 0) {
      const sum = avgData.reduce((acc, row) => acc + (row.rating || 0), 0)
      averageRating = Number((sum / avgData.length).toFixed(2))
    }

    return NextResponse.json({
      success: true,
      metrics: {
        pendingCount: pendingCount || 0,
        approvedCount: approvedCount || 0,
        rejectedCount: rejectedCount || 0,
        totalReviews: totalReviews || 0,
        lowRatingCount: lowRatingCount || 0,
        averageRating,
        photosCount: photosCount || 0,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch review metrics' },
      { status: 500 }
    )
  }
}
