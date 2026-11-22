import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getCollections } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const url = new URL(req.url)
    const showOnHome = url.searchParams.get('showOnHome') === 'true'
    const showInNavbar = url.searchParams.get('showInNavbar') === 'true'

    const options: any = { onlyActive: true }
    if (showOnHome) options.showOnHome = true
    if (showInNavbar) options.showInNavbar = true

    const collections = await getCollections(supabase, options)
    return NextResponse.json({ success: true, collections: collections || [] })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}
