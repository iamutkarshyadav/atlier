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

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const orders = await getAllOrders(supabase)
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, status, courierId, deliveryNotes } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    if (courierId !== undefined) {
      await assignOrderCourier(supabase, orderId, courierId === 'unassigned' ? null : courierId)
    }

    if (status !== undefined) {
      await updateOrderStatus(supabase, orderId, status as OrderStatus, deliveryNotes)
    }

    return NextResponse.json({ success: true, orderId })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Update failed' },
      { status: 500 }
    )
  }
}
