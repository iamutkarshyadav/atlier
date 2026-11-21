import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getPurchaseOrders, getPurchaseOrderItems, createPurchaseOrderWithItems } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId') || undefined
    const poId = searchParams.get('poId')
    const supabase = createServiceRoleClient()

    if (poId) {
      const items = await getPurchaseOrderItems(supabase, poId)
      return NextResponse.json({ items }, { status: 200 })
    }

    const orders = await getPurchaseOrders(supabase, locationId)
    return NextResponse.json({ purchaseOrders: orders }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list purchase orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { poData, items } = body
    if (!poData) {
      return NextResponse.json({ error: 'Missing purchase order data' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const result = await createPurchaseOrderWithItems(supabase, poData, items || [])
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, po: result.po }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create purchase order' }, { status: 500 })
  }
}
