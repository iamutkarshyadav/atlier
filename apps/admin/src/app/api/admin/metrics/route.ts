import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // 1. Open / in-flight orders count
    const { count: openOrdersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing', 'out_for_delivery'])

    // 2. Low-stock / depleted products count
    const { count: lowStockCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .lte('stock', 15)
      .eq('is_archived', false)

    // 3. Pending transfers count
    let pendingTransfersCount = 0
    try {
      const { count } = await supabase
        .from('stock_transfers')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'picked', 'in_transit'])
      pendingTransfersCount = count ?? 0
    } catch {
      pendingTransfersCount = 0
    }

    // 4. Open purchase orders awaiting GRN receipt
    let openPoCount = 0
    try {
      const { count } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['issued', 'partially_received'])
      openPoCount = count ?? 0
    } catch {
      openPoCount = 0
    }

    return NextResponse.json({
      success: true,
      metrics: {
        openOrdersCount: openOrdersCount ?? 0,
        lowStockCount: lowStockCount ?? 0,
        pendingTransfersCount,
        openPoCount,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
