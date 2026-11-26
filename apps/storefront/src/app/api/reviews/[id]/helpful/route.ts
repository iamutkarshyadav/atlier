import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { toggleReviewHelpfulVote } from '@repo/supabase'

export const dynamic = 'force-dynamic'

const VOTER_COOKIE_NAME = 'mt_voter_id'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id
    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceRoleClient()

    let userId: string | null = null
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {
      userId = null
    }

    const existingAnonId = req.cookies.get(VOTER_COOKIE_NAME)?.value
    const anonId = existingAnonId || crypto.randomUUID()
    const voterKey = userId ? `user:${userId}` : `anon:${anonId}`

    const result = await toggleReviewHelpfulVote(serviceSupabase, reviewId, voterKey, userId)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Unable to update helpful vote' },
        { status: 400 }
      )
    }

    const res = NextResponse.json({
      success: true,
      helpfulCount: result.helpfulCount,
      voted: result.voted,
    })

    if (!userId && !existingAnonId) {
      res.cookies.set(VOTER_COOKIE_NAME, anonId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    return res
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error recording helpful vote' },
      { status: 500 }
    )
  }
}
