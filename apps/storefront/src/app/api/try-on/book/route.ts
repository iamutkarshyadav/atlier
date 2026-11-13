import { NextRequest, NextResponse } from 'next/server'
import { prisma, LocationType, OrderStatus, TryOnStatus } from '@repo/db'
import { getTryOnQueue } from '@repo/queue'

export const dynamic = 'force-dynamic'

interface BookTryOnItem {
  variantId?: string
  sku?: string
  quantity: number
}

interface BookTryOnPayload {
  orderNumber?: string
  scheduledSlot?: string
  items: BookTryOnItem[]
  pincode?: string
  deliveryAddress?: string
  depositAmount?: number
}

export async function POST(req: NextRequest) {
  try {
    const body: BookTryOnPayload = await req.json()
    const {
      orderNumber = `TRY-${Date.now().toString(36).toUpperCase()}`,
      scheduledSlot = '14:00 - 16:00 Doorstep Fitting',
      items,
      pincode,
      deliveryAddress,
      depositAmount = 99.0,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: non-empty items array required' },
        { status: 400 }
      )
    }

    if (items.length > 5) {
      return NextResponse.json(
        { error: 'Try-at-Home accommodates up to 5 garments per fitting session' },
        { status: 400 }
      )
    }

    // 1. Resolve ECOM_WAREHOUSE location
    const ecomLoc = await prisma.location.findFirst({
      where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
    })

    if (!ecomLoc) {
      return NextResponse.json(
        { error: 'E-Commerce fulfillment hub not found' },
        { status: 500 }
      )
    }

    // 2. Resolve or provision a placeholder transit vehicle
    const vehicleCode = `VAN-TRANSIT-${(pincode || 'BLR01').slice(0, 5)}`
    let vehicle = await prisma.location.findUnique({
      where: { code: vehicleCode },
    })

    if (!vehicle) {
      vehicle = await prisma.location.create({
        data: {
          code: vehicleCode,
          name: `Transit Vehicle (${vehicleCode})`,
          type: LocationType.TRANSIT_VEHICLE,
          isActive: true,
        },
      })
    }

    // 3. Resolve variant IDs and calculate total garment value
    const resolvedItems: Array<{
      variantId: string
      quantity: number
      unitPrice: number
    }> = []

    for (const it of items) {
      let variant = null
      if (it.variantId) {
        variant = await prisma.productVariant.findUnique({
          where: { id: it.variantId },
          include: { product: true },
        })
      } else if (it.sku) {
        variant = await prisma.productVariant.findUnique({
          where: { sku: it.sku },
          include: { product: true },
        })
      }

      if (!variant) {
        return NextResponse.json(
          { error: `Variant (${it.variantId || it.sku}) does not exist in catalog` },
          { status: 404 }
        )
      }

      resolvedItems.push({
        variantId: variant.id,
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
        unitPrice: Number(variant.product.price),
      })
    }

    // 4. Create Order & TryOnSession in Database
    const totalGarmentValue = resolvedItems.reduce(
      (sum, it) => sum + it.quantity * it.unitPrice,
      0
    )

    const order = await prisma.order.create({
      data: {
        orderNumber,
        fulfillmentLocationId: ecomLoc.id,
        status: OrderStatus.PENDING,
        totalAmount: depositAmount, // ₹99 booking hold
        deliveryAddress: deliveryAddress || `Pincode: ${pincode || '560038'}`,
        deliveryNotes: `Try-at-Home session for ${resolvedItems.length} pieces. Full Garment Value: ₹${totalGarmentValue}`,
        items: {
          create: resolvedItems.map((it) => ({
            variantId: it.variantId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        },
        tryOnSession: {
          create: {
            transitVehicleId: vehicle.id,
            status: TryOnStatus.PENDING,
            scheduledSlot,
            depositPaid: depositAmount,
          },
        },
      },
      include: {
        tryOnSession: true,
      },
    })

    return NextResponse.json({
      success: true,
      status: 'BOOKED_PENDING_DISPATCH',
      orderNumber: order.orderNumber,
      tryOnSessionId: order.tryOnSession?.id,
      scheduledSlot,
      depositPaid: depositAmount,
      totalGarments: resolvedItems.reduce((acc, i) => acc + i.quantity, 0),
      message: 'Try-at-Home booking confirmed. Ready for warehouse staging and vehicle dispatch.',
    })
  } catch (err: any) {
    console.error('Try-on booking error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to book Try-at-Home fitting slot' },
      { status: 500 }
    )
  }
}

