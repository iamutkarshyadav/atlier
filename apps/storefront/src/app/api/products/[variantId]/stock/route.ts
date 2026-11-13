import { NextRequest, NextResponse } from 'next/server'
import { prisma, getEcomAvailableStock, LocationType } from '@repo/db'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { variantId: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const rawId = decodeURIComponent(params.variantId)

    // 1. Resolve variant by ID or SKU
    let variant = await prisma.productVariant.findUnique({
      where: { id: rawId },
      include: { product: true },
    })

    if (!variant) {
      variant = await prisma.productVariant.findUnique({
        where: { sku: rawId },
        include: { product: true },
      })
    }

    if (!variant) {
      return NextResponse.json(
        { error: `Garment variant "${rawId}" not found in catalog` },
        { status: 404 }
      )
    }

    // 2. Query Strictly Ringfenced Stock for ECOM_WAREHOUSE
    const ecomLoc = await prisma.location.findFirst({
      where: { type: LocationType.ECOM_WAREHOUSE, isActive: true },
    })

    if (!ecomLoc) {
      return NextResponse.json(
        { error: 'E-Commerce warehouse not provisioned in location topology' },
        { status: 500 }
      )
    }

    const availableStock = await getEcomAvailableStock(variant.id, ecomLoc.id)

    return NextResponse.json({
      success: true,
      variantId: variant.id,
      sku: variant.sku,
      productTitle: variant.product.title,
      size: variant.size,
      availableStock,
      ringfencedLocation: ecomLoc.code,
      locationType: ecomLoc.type,
    })
  } catch (err: any) {
    console.error('Storefront stock fetch error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to query ringfenced stock' },
      { status: 500 }
    )
  }
}

