import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { prisma } from '@repo/db'
import {
  getAllOrders,
  createOrderWithItems,
  updateOrderStatus,
  assignOrderCourier,
  type OrderStatus,
} from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

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
    if (!auth.authorized) {
      return auth.response
    }

    const orders = (await getAllOrders(supabase)) as any[]

    // Merge any Prisma ledger orders from @repo/db
    try {
      const dbOrders = await prisma.order.findMany({
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
          tryOnSession: true,
          fulfillmentLocation: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const existingNumbers = new Set(orders.map((o: any) => o.order_number))
      for (const dbo of dbOrders) {
        if (!existingNumbers.has(dbo.orderNumber)) {
          orders.unshift({
            id: dbo.id,
            order_number: dbo.orderNumber,
            invoice_number: `INV-${dbo.orderNumber}`,
            tracking_barcode: `TRK-${dbo.orderNumber}`,
            user_id: dbo.userId || 'a0000000-0000-0000-0000-000000000001',
            status: dbo.status.toLowerCase() as any,
            order_type: dbo.tryOnSession ? 'bolt_try_on' : 'standard',
            delivery_mode: dbo.tryOnSession ? 'try_on' : 'direct',
            total: Number(dbo.totalAmount),
            original_total: Number(dbo.totalAmount),
            tax_amount: 0,
            shipping_fee: dbo.tryOnSession ? 99 : 150,
            shipping_address: dbo.deliveryAddress || 'Bengaluru, India',
            delivery_notes: dbo.deliveryNotes,
            created_at: dbo.createdAt.toISOString(),
            updated_at: dbo.updatedAt.toISOString(),
            order_items: dbo.items.map((it: any) => ({
              id: it.id,
              order_id: dbo.id,
              product_id: it.variant.productId,
              quantity: it.qty,
              unit_price: Number(it.unitPrice),
              size: it.variant.size,
              product: {
                id: it.variant.productId,
                title: it.variant.product.title,
                price: Number(it.variant.product.price),
                image_url: it.variant.product.imageUrl || '',
                material: it.variant.product.material,
              },
            })),
          })
        }
      }
    } catch {}

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
    if (!auth.authorized) {
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
    const supabase = await createServerSupabaseClient()
    const auth = await verifyStaffSession(supabase)
    if (!auth.authorized) {
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
