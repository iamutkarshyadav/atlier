import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getLocationShelves, getShelfInventory } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')
    if (!locationId) {
      return NextResponse.json({ error: 'locationId query param is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const shelves = await getLocationShelves(supabase, locationId)

    const detailed = await Promise.all(
      shelves.map(async (sh) => {
        try {
          const items = await getShelfInventory(supabase, sh.id)
          const total = items.reduce((sum, it) => sum + it.quantity, 0)
          return { ...sh, items, totalItems: total }
        } catch {
          return { ...sh, items: [], totalItems: 0 }
        }
      })
    )

    return NextResponse.json({ shelves: detailed }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list shelves' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('shelves')
      .insert({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true, shelf: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create shelf' }, { status: 500 })
  }
}
