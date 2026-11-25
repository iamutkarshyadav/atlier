import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getStorefrontPopups, saveStorefrontPopup, deleteStorefrontPopup } from '@repo/supabase'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()
    const popups = await getStorefrontPopups(supabase, { activeOnly: false })
    const popup = popups.find((p) => p.id === id)

    if (!popup) {
      return NextResponse.json({ success: false, error: 'Popup not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, popup })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch popup' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await req.json()
    const supabase = createServiceRoleClient()

    const result = await saveStorefrontPopup(supabase, { ...body, id })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, popup: result.popup })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update popup' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = createServiceRoleClient()

    const result = await deleteStorefrontPopup(supabase, id)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete popup' },
      { status: 500 }
    )
  }
}
