import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import {
  buildOrderReferenceOrFilter,
  DEFAULT_BOLT_TIMESLOTS,
  DEFAULT_ORDERS,
  getLocalReturnRequests,
  maskShippingAddress,
} from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const rawRef = decodeURIComponent(params.orderId || '').trim()
    if (!rawRef) {
      return NextResponse.json(
        { success: false, error: 'Order reference is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const adminClient = createServiceRoleClient()

    // 1. Resolve authenticated user if present
    let user: { id: string; email?: string; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> } | null = null
    try {
      const {
        data: { user: cookieUser },
      } = await supabase.auth.getUser()
      user = cookieUser
    } catch {
      user = null
    }

    if (!user) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.replace(/^bearer\s+/i, '').trim()
        if (token) {
          const {
            data: { user: tokenUser },
          } = await supabase.auth.getUser(token)
          user = tokenUser
        }
      }
    }

    // 2. Query order safely by UUID, order_number, or tracking_barcode
    const { data: matchedOrders, error } = await adminClient
      .from('orders')
      .select('*, order_items(*, product:products(id, title, image_url, price, material, category))')
      .or(buildOrderReferenceOrFilter(rawRef))
      .order('created_at', { ascending: false })
      .limit(1)

    let order: any = !error && matchedOrders && matchedOrders.length > 0 ? matchedOrders[0] : null

    if (!order) {
      const fallback = DEFAULT_ORDERS.find(
        (o) =>
          o.id === rawRef ||
          o.order_number?.toLowerCase() === rawRef.toLowerCase() ||
          o.tracking_barcode?.toLowerCase() === rawRef.toLowerCase()
      )
      if (fallback) {
        order = fallback
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order "${rawRef}" was not found.` },
        { status: 404 }
      )
    }

    // 3. Check ownership / staff privilege for PII visibility
    const isStaff =
      user?.app_metadata?.role === 'admin' ||
      user?.user_metadata?.role === 'admin' ||
      user?.email === 'horizonlord1@gmail.com' ||
      user?.email === 'iamutkarshyadav1@gmail.com'
    const isAuthorizedOwner = Boolean(user && (order.user_id === user.id || isStaff))

    // 4. Fetch optional Courier, Timeslot, Promotion, and Return Requests
    const courierId = order.delivery_partner_id || order.delivery_courier_id || null
    const promoId = order.promotion_id || order.applied_promotion_id || null

    const [courierRes, timeslotRes, promoRes, returnsRes] = await Promise.all([
      courierId
        ? adminClient
            .from('users')
            .select('id, name, phone')
            .eq('id', courierId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      order.bolt_timeslot_id
        ? adminClient
            .from('bolt_timeslots')
            .select('*')
            .eq('id', order.bolt_timeslot_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      promoId
        ? adminClient
            .from('promotions')
            .select('*, rules:promotion_rules(*)')
            .eq('id', promoId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      adminClient
        .from('return_requests')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .then((res) => res, () => ({ data: null, error: { code: 'PGRST205' } })),
    ])

    const courier = courierRes?.data
      ? {
          id: courierRes.data.id,
          name: courierRes.data.name || 'Maison TG Concierge',
          phone: isAuthorizedOwner ? courierRes.data.phone : null,
        }
      : null

    const timeslot =
      timeslotRes?.data ||
      (order.bolt_timeslot_id
        ? DEFAULT_BOLT_TIMESLOTS.find((s) => s.id === order.bolt_timeslot_id) || null
        : null)

    const promotion = promoRes?.data || null

    const localReturns = getLocalReturnRequests(order.id)
    const dbReturns = Array.isArray((returnsRes as any)?.data) ? (returnsRes as any).data : []
    const returnRequests = dbReturns.length > 0 ? dbReturns : localReturns

    // 5. Mask sensitive PII for unauthenticated order-reference lookups
    const sanitizedOrder = isAuthorizedOwner
      ? order
      : {
          ...order,
          shipping_address: maskShippingAddress(order.shipping_address),
          shipping_address_json: null,
          billing_address_json: null,
          delivery_notes: null,
        }

    return NextResponse.json({
      success: true,
      order: sanitizedOrder,
      courier,
      timeslot,
      promotion,
      returnRequests,
      isAuthorizedOwner,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load order tracking details' },
      { status: 500 }
    )
  }
}
