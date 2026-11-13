import { NextRequest, NextResponse } from 'next/server'
import { prisma, executeInboundSupply, LocationType } from '@repo/db'

export const dynamic = 'force-dynamic'

interface InboundItemRequest {
  variantId?: string
  sku?: string
  quantity: number
}

interface InboundPayload {
  supplierLocationCode?: string
  destinationLocationCode?: string
  destinationLocationId?: string
  items: InboundItemRequest[]
  referenceId?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: InboundPayload = await req.json()
    const {
      supplierLocationCode = 'SYS-SUPPLIER-INBOUND',
      destinationLocationCode,
      destinationLocationId,
      items,
      referenceId = `GRN-${Date.now()}`,
      notes,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: non-empty items array required' },
        { status: 400 }
      )
    }

    // 1. Resolve Supplier Location
    const supplierLoc = await prisma.location.findFirst({
      where: {
        code: supplierLocationCode,
        type: LocationType.SUPPLIER,
      },
    })

    if (!supplierLoc) {
      return NextResponse.json(
        { error: `Supplier location "${supplierLocationCode}" not found` },
        { status: 404 }
      )
    }

    // 2. Resolve Destination Location (ECOM_WAREHOUSE or RETAIL_STORE)
    let destLoc = null
    if (destinationLocationId) {
      destLoc = await prisma.location.findUnique({
        where: { id: destinationLocationId },
      })
    } else if (destinationLocationCode) {
      destLoc = await prisma.location.findUnique({
        where: { code: destinationLocationCode },
      })
    } else {
      // Default to ECOM_WAREHOUSE if not explicitly set
      destLoc = await prisma.location.findFirst({
        where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
      })
    }

    if (!destLoc) {
      return NextResponse.json(
        { error: 'Destination location not found or invalid' },
        { status: 404 }
      )
    }

    // 3. Resolve variant IDs from SKUs if necessary
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

    // 4. Execute Atomic Double-Entry Inbound Supply
    const records = await executeInboundSupply({
      supplierLocationId: supplierLoc.id,
      destinationLocationId: destLoc.id,
      items: resolvedItems,
      referenceId,
      notes: notes || `Supplier intake to ${destLoc.code}`,
    })

    return NextResponse.json({
      success: true,
      referenceId,
      destinationLocation: destLoc.code,
      destinationLocationId: destLoc.id,
      itemsCount: records.length,
      totalQuantity: resolvedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      records,
    })
  } catch (err: any) {
    console.error('Inbound intake error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to process inbound supply' },
      { status: 500 }
    )
  }
}

