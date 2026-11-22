import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { getStockTransfers } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const { data: transfers, error } = await supabase
      .from('stock_transfers')
      .select('*, stock_transfer_items(*, variant:product_variants(id, sku, size, barcode, product:products(id, title)))')
      .order('created_at', { ascending: false })

    if (error) {
      const fallbackTransfers = await getStockTransfers(supabase)
      return NextResponse.json({ transfers: fallbackTransfers }, { status: 200 })
    }

    return NextResponse.json({ transfers: transfers || [] }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list stock transfers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createServiceRoleClient()

    const { items, ...transferHeader } = body

    const { data, error } = await supabase
      .from('stock_transfers')
      .insert({
        ...transferHeader,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to create stock transfer header' }, { status: 400 })
    }

    if (items && Array.isArray(items) && items.length > 0) {
      const itemsPayload = items.map((it: any) => ({
        transfer_id: data.id,
        variant_id: it.variant_id,
        source_shelf_id: it.source_shelf_id || null,
        quantity_requested: Number(it.quantity_requested || it.quantity) || 1,
        quantity_shipped: 0,
        quantity_received: 0,
      }))
      const { error: itemsErr } = await supabase.from('stock_transfer_items').insert(itemsPayload)
      if (itemsErr) {
        console.warn('Failed to insert transfer line items:', itemsErr)
      }
    }

    return NextResponse.json({ success: true, transfer: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create stock transfer' }, { status: 500 })
  }
}
