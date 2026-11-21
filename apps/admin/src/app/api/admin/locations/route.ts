import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getLocations, getLocationZones, getLocationShelves } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('id')

    if (locationId) {
      const { data: loc, error: locErr } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .maybeSingle()

      if (locErr || !loc) {
        return NextResponse.json({ error: locErr?.message || 'Location not found' }, { status: 404 })
      }
      const [zones, shelves] = await Promise.all([
        getLocationZones(supabase, locationId),
        getLocationShelves(supabase, locationId),
      ])
      return NextResponse.json({ location: loc, zones, shelves }, { status: 200 })
    }

    const locations = await getLocations(supabase)
    const detailed = await Promise.all(
      locations.map(async (loc) => {
        try {
          const [zones, shelves] = await Promise.all([
            getLocationZones(supabase, loc.id),
            getLocationShelves(supabase, loc.id),
          ])
          return { ...loc, zoneCount: zones.length, shelfCount: shelves.length }
        } catch {
          return { ...loc, zoneCount: 0, shelfCount: 0 }
        }
      })
    )
    return NextResponse.json({ locations: detailed }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list locations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceRoleClient()

    const { data: newLoc, error: locErr } = await supabase
      .from('locations')
      .insert({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (locErr || !newLoc) {
      return NextResponse.json({ error: locErr?.message || 'Failed to insert location' }, { status: 400 })
    }

    // Default WMS zones
    const DEFAULT_ZONES = [
      { code: 'RCV', name: 'Receiving Dock', type: 'receiving_dock' as const },
      { code: 'BLK', name: 'Bulk Storage', type: 'bulk_storage' as const },
      { code: 'FLR', name: 'Sales Floor', type: 'sales_floor' as const },
      { code: 'QRN', name: 'Quarantine & Returns', type: 'fitting_room_quarantine' as const },
      { code: 'BCK', name: 'Backroom Reserve', type: 'backroom_stock' as const },
    ]

    const zoneInserts = DEFAULT_ZONES.map((z) => ({
      location_id: newLoc.id,
      code: z.code,
      name: z.name,
      type: z.type,
      is_active: true,
      created_at: new Date().toISOString(),
    }))

    await supabase.from('location_zones').insert(zoneInserts as any)

    return NextResponse.json({ success: true, location: newLoc }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create location' }, { status: 500 })
  }
}
