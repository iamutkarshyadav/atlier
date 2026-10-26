import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getOrderById } from '@repo/supabase/utils'
import { generateInvoicePdfBuffer } from '../../../../lib/invoicePdf'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const { searchParams } = new URL(req.url)
    const download = searchParams.get('download') === 'true'

    const supabase = await createServerSupabaseClient()
    const order = await getOrderById(supabase, orderId)

    if (!order) {
      return NextResponse.json(
        { error: `Order not found with identifier: ${orderId}` },
        { status: 404 }
      )
    }

    const pdfBuffer = await generateInvoicePdfBuffer(order)
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
    return NextResponse.json(
      { error: error.message || 'Error generating invoice PDF' },
      { status: 500 }
    )
  }
}
