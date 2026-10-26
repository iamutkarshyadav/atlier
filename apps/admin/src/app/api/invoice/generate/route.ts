import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getOrderById } from '@repo/supabase/utils'
import { generateInvoicePdfBuffer } from '../../../../lib/invoicePdf'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId') || searchParams.get('id')
    const download = searchParams.get('download') === 'true'

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId or id' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const order = await getOrderById(supabase, orderId)

    if (!order) {
      return NextResponse.json(
        { error: `Order not found with identifier: ${orderId}` },
        { status: 404 }
      )
    }

    // 1. Generate high-resolution PDF buffer
    const pdfBuffer = await generateInvoicePdfBuffer(order)

    // 2. Upload to Supabase Storage 'invoices' bucket asynchronously
    try {
      const fileName = `${order.invoice_number || `INV-2026-${order.id.slice(0, 6)}`}.pdf`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileName)

        if (publicUrlData?.publicUrl && (!order.invoice_url || order.invoice_url !== publicUrlData.publicUrl)) {
          await supabase
            .from('orders')
            .update({ invoice_url: publicUrlData.publicUrl })
            .eq('id', order.id)
        }
      }
    } catch (storageErr) {
      console.warn('Supabase storage upload note (bucket may be in mock/unprovisioned mode):', storageErr)
    }

    // 3. Return the binary PDF stream
    const invoiceNum = order.invoice_number || `INV-2026-${order.id.slice(0, 6)}`
    const disposition = download ? 'attachment' : 'inline'

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="Atelier-Gustavo-Invoice-${invoiceNum}.pdf"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error: any) {
    console.error('Invoice generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal error generating invoice PDF' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const orderId = body.orderId || body.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId in request body' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const order = await getOrderById(supabase, orderId)

    if (!order) {
      return NextResponse.json(
        { error: `Order not found with identifier: ${orderId}` },
        { status: 404 }
      )
    }

    const pdfBuffer = await generateInvoicePdfBuffer(order)
    const fileName = `${order.invoice_number || `INV-2026-${order.id.slice(0, 6)}`}.pdf`

    let publicUrl: string | null = null

    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileName)
        publicUrl = publicUrlData?.publicUrl || null

        if (publicUrl) {
          await supabase
            .from('orders')
            .update({ invoice_url: publicUrl })
            .eq('id', order.id)
        }
      }
    } catch (storageErr) {
      console.warn('Storage upload catch:', storageErr)
    }

    return NextResponse.json({
      success: true,
      invoiceNumber: order.invoice_number,
      trackingBarcode: order.tracking_barcode,
      invoiceUrl: publicUrl || `/api/invoice/generate?orderId=${order.id}`,
      total: order.total,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error processing invoice generation' },
      { status: 500 }
    )
  }
}
