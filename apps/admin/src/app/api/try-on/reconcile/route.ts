import { NextRequest, NextResponse } from 'next/server'
import { prisma, reconcileTryOnDoorstep, LocationType } from '@repo/db'

export const dynamic = 'force-dynamic'

interface ReconcileItem {
  variantId?: string
  sku?: string
  quantity: number
}

interface ReconcilePayload {
  tryOnSessionId?: string
  orderNumber?: string
  keptItems?: ReconcileItem[]
  rejectedItems?: ReconcileItem[]
  paymentMethod?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ReconcilePayload = await req.json()
    const {
      tryOnSessionId,
      orderNumber,
      keptItems = [],
      rejectedItems = [],
      paymentMethod = 'DOORSTEP_UPI',
    } = body

    // 1. Resolve Try-On Session
    let session = null
    if (tryOnSessionId) {
      session = await prisma.tryOnSession.findUnique({
        where: { id: tryOnSessionId },
        include: { order: true },
      })
    } else if (orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { tryOnSession: true },
      })
      session = order?.tryOnSession || null
    }

    if (!session) {
      return NextResponse.json(
        { error: `Try-on session (${tryOnSessionId || orderNumber}) not found` },
        { status: 404 }
      )
    }

    // 2. Resolve ECOM Warehouse and Customer Sink Locations
    const [ecomLoc, customerLoc] = await Promise.all([
      prisma.location.findFirst({
        where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
      }),
      prisma.location.findFirst({
        where: { type: LocationType.CUSTOMER },
      }),
    ])

    if (!ecomLoc || !customerLoc) {
      return NextResponse.json(
        { error: 'Required accounting locations (ECOM_WAREHOUSE or CUSTOMER) not found' },
        { status: 500 }
      )
    }

    // 3. Helper to resolve variant IDs
    const resolveList = async (list: ReconcileItem[]) => {
      const result: Array<{ variantId: string; quantity: number }> = []
      for (const it of list) {
        let vId = it.variantId
        if (!vId && it.sku) {
          const v = await prisma.productVariant.findUnique({
            where: { sku: it.sku },
            select: { id: true },
          })
          if (v) vId = v.id
        }
        if (vId) {
          result.push({
            variantId: vId,
            quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
          })
        }
      }
      return result
    }

    const resolvedKept = await resolveList(keptItems)
    const resolvedRejected = await resolveList(rejectedItems)

    // 4. Execute Double-Entry Doorstep Reconciliation
    const result = await reconcileTryOnDoorstep({
      tryOnSessionId: session.id,
      ecomLocationId: ecomLoc.id,
      customerLocationId: customerLoc.id,
      keptItems: resolvedKept,
      rejectedItems: resolvedRejected,
      collectedPaymentMode: paymentMethod,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      orderNumber: result.orderNumber,
      keptCount: result.keptCount,
      rejectedCount: result.rejectedCount,
      status: 'RECONCILED',
    })
  } catch (err: any) {
    console.error('Try-on reconcile error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to reconcile try-on doorstep fitting' },
      { status: 500 }
    )
  }
}

