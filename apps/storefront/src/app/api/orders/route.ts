import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getAllOrders,
  createOrderWithItems,
  updateOrderStatus,
  assignOrderCourier,
  type OrderStatus,
} from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')?.toLowerCase().trim()

    let orders = await getAllOrders(supabase)

    if (userId) {
      orders = orders.filter(
        (o) => o.user_id === userId || (o.user as any)?.id === userId
      )
    } else if (email) {
      orders = orders.filter(
        (o) =>
          (o.user as any)?.email?.toLowerCase() === email ||
          (o.shipping_address && o.shipping_address.toLowerCase().includes(email))
      )
    }

    return NextResponse.json({ success: true, orders })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderData, items } = body

    if (!orderData || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid payload: orderData and items array required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const result = await createOrderWithItems(supabase, orderData, items)

    if (!result.data) {
      return NextResponse.json(
        { error: result.error || 'Could not place order' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      order: result.data,
      orderNumber: result.data.order_number,
      invoiceNumber: result.data.invoice_number,
      trackingBarcode: result.data.tracking_barcode,
      total: result.data.total,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal order creation failure' },
      { status: 500 }
    )
  }
}
