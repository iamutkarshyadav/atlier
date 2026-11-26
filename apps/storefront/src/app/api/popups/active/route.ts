import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getStorefrontPopups, recordPopupAnalytics } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pathname = searchParams.get('pathname') || '/'
    const categoryId = searchParams.get('categoryId') || undefined
    const productId = searchParams.get('productId') || undefined

    const queryParams: Record<string, string> = {}
    searchParams.forEach((val, key) => {
      if (key !== 'pathname' && key !== 'categoryId' && key !== 'productId') {
        queryParams[key] = val
      }
    })

    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch {}

    const popups = await getStorefrontPopups(supabase, {
      activeOnly: true,
      pathname,
      searchParams: queryParams,
      categoryId,
      productId,
    })

    return NextResponse.json({ success: true, popups })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch active popups' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { popupId, event } = body

    if (!popupId || (event !== 'impression' && event !== 'click')) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: popupId and event (impression|click) required' },
        { status: 400 }
      )
    }

    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch {}

    await recordPopupAnalytics(supabase, popupId, event)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to record event' },
      { status: 500 }
    )
  }
}
