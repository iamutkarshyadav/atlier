import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getStorefrontPopups, saveStorefrontPopup } from '@repo/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const popups = await getStorefrontPopups(supabase, { activeOnly: false })
    return NextResponse.json({ success: true, popups })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch popups' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceRoleClient()
    const result = await saveStorefrontPopup(supabase, body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, popup: result.popup }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create popup campaign' },
      { status: 500 }
    )
  }
}
