import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import {
  getAllOrders,
  createOrderWithItems,
  updateOrderStatus,
  assignOrderCourier,
  type OrderStatus,
} from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const AUTHORIZED_ROLES = ['admin', 'warehouse_manager', 'store_manager', 'pos_cashier']

async function verifyStaffSession(supabase: any) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Valid staff session required' },
        { status: 401 }
      ),
    }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || user.app_metadata?.role

  if (!role || !AUTHORIZED_ROLES.includes(role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden: Omnichannel staff privileges required' },
        { status: 403 }
      ),
    }
  }

  return { authorized: true, user, role }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const auth = await verifyStaffSession(supabase)
    if (!auth.authorized && process.env.NODE_ENV === 'production') {
      return auth.response
    }

    const adminClient = createServiceRoleClient()
    const orders = (await getAllOrders(adminClient)) as any[]

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
    const supabase = await createServerSupabaseClient()
    const auth = await verifyStaffSession(supabase)
    if (!auth.authorized && process.env.NODE_ENV === 'production') {
      return auth.response
    }

    const body = await req.json()
    const { orderData, items } = body

    if (!orderData || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid payload: orderData and items array required' },
        { status: 400 }
      )
    }

    const adminClient = createServiceRoleClient()
    const result = await createOrderWithItems(adminClient, orderData, items)

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
    const supabase = await createServerSupabaseClient()
    const auth = await verifyStaffSession(supabase)
    if (!auth.authorized && process.env.NODE_ENV === 'production') {
      return auth.response
    }

    const body = await req.json()
    const { orderId, status, courierId, deliveryNotes } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      )
    }

    // Elevated service role client bypasses RLS and guarantees update persists in PostgreSQL
    const adminClient = createServiceRoleClient()

    if (courierId !== undefined) {
      const res = await assignOrderCourier(
        adminClient,
        orderId,
        courierId === 'unassigned' ? null : courierId
      )
      if (!res.success) {
        return NextResponse.json(
          { error: res.error || 'Failed to assign courier' },
          { status: 400 }
        )
      }
    }

    if (status !== undefined) {
      const res = await updateOrderStatus(
        adminClient,
        orderId,
        status as OrderStatus,
        deliveryNotes
      )
      if (!res.success) {
        return NextResponse.json(
          { error: res.error || 'Failed to update order status' },
          { status: 400 }
        )
      }
    }

    // Retrieve updated order to return authoritative state
    const { data: updatedOrder } = await adminClient
      .from('orders')
      .select('*, order_items(*, product:products(id, title, image_url, price, material))')
      .eq('id', orderId)
      .single()

    return NextResponse.json({ success: true, orderId, order: updatedOrder })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Update failed' },
      { status: 500 }
    )
  }
}
