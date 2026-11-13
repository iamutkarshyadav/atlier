import { NextRequest, NextResponse } from 'next/server'
import { prisma, dispatchTryOnToVehicle, LocationType, TryOnStatus } from '@repo/db'

export const dynamic = 'force-dynamic'

interface DispatchPayload {
  tryOnSessionId?: string
  orderNumber?: string
  ecomLocationCode?: string
  vehicleCode?: string
  items: Array<{ variantId?: string; sku?: string; quantity: number }>
}

export async function POST(req: NextRequest) {
  try {
    const body: DispatchPayload = await req.json()
    const {
      tryOnSessionId,
      orderNumber,
      ecomLocationCode = 'ECOM-WH01',
      vehicleCode = 'VAN-RIDER-KA01',
      items,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: non-empty items array required' },
        { status: 400 }
      )
    }

    // 1. Resolve ECOM Warehouse Location
    const ecomLoc = await prisma.location.findFirst({
      where: {
        code: ecomLocationCode,
        type: LocationType.ECOM_WAREHOUSE,
        isActive: true,
      },
    })

    if (!ecomLoc) {
      return NextResponse.json(
        { error: `E-Commerce warehouse (${ecomLocationCode}) not found` },
        { status: 404 }
      )
    }

    // 2. Resolve or Dynamically Provision Transit Vehicle Location
    let vehicleLoc = await prisma.location.findUnique({
      where: { code: vehicleCode },
    })

    if (!vehicleLoc) {
      vehicleLoc = await prisma.location.create({
        data: {
          code: vehicleCode,
          name: `Doorstep Transit Vehicle (${vehicleCode})`,
          type: LocationType.TRANSIT_VEHICLE,
          isActive: true,
        },
      })
    }

    // 3. Resolve Try-On Session
    let session = null
    if (tryOnSessionId) {
      session = await prisma.tryOnSession.findUnique({
        where: { id: tryOnSessionId },
        include: { order: true },
      })
    } else if (orderNumber) {
      session = await prisma.tryOnSession.findFirst({
        where: { order: { orderNumber } },
        include: { order: true },
      })
    }

    if (!session) {
      // Auto-provision a placeholder try-on order and session for standalone dispatch simulation
      const fallbackOrderNumber = orderNumber || `TRY-${Date.now()}`
      const newOrder = await prisma.order.create({
        data: {
          orderNumber: fallbackOrderNumber,
          fulfillmentLocationId: ecomLoc.id,
          totalAmount: 99.0,
          status: 'PENDING',
        },
      })

      session = await prisma.tryOnSession.create({
        data: {
          orderId: newOrder.id,
          transitVehicleId: vehicleLoc.id,
          status: TryOnStatus.PENDING,
          scheduledSlot: '14:00 - 16:00 Doorstep Fitting',
          depositPaid: 99.0,
        },
        include: { order: true },
      })
    }

    // 4. Resolve variant IDs from SKUs
    const resolvedItems: Array<{ variantId: string; quantity: number }> = []

    for (const it of items) {
      let vId = it.variantId
      if (!vId && it.sku) {
        const variant = await prisma.productVariant.findUnique({
          where: { sku: it.sku },
          select: { id: true },
        })
        if (!variant) {
          return NextResponse.json(
            { error: `Product variant with SKU "${it.sku}" not found` },
            { status: 404 }
          )
        }
        vId = variant.id
      }

      if (!vId) {
        return NextResponse.json(
          { error: 'Each item must specify either variantId or sku' },
          { status: 400 }
        )
      }

      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
      resolvedItems.push({ variantId: vId, quantity: qty })
    }

    // 5. Execute Double-Entry Dispatch into Transit Vehicle
    const result = await dispatchTryOnToVehicle({
      tryOnSessionId: session.id,
      ecomLocationId: ecomLoc.id,
      transitVehicleId: vehicleLoc.id,
      items: resolvedItems,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      orderNumber: session.order.orderNumber,
      transitVehicle: vehicleLoc.code,
      status: result.status,
      dispatchedItems: resolvedItems,
    })
  } catch (err: any) {
    console.error('Try-on dispatch error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to dispatch try-on order to vehicle' },
      { status: 500 }
    )
  }
}
