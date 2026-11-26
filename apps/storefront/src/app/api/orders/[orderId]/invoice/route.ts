import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import {
  buildOrderReferenceOrFilter,
  DEFAULT_ORDERS,
  formatIstTimestamp,
  maskShippingAddress,
} from '@repo/supabase/utils'
import { BOLT_HOLD_FEE } from '@repo/supabase/pricing'

export const dynamic = 'force-dynamic'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const rawRef = decodeURIComponent(params.orderId || '').trim()
    if (!rawRef) {
      return new NextResponse('Order reference required', { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const adminClient = createServiceRoleClient()

    let user: { id: string; email?: string; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> } | null = null
    try {
      const {
        data: { user: cookieUser },
      } = await supabase.auth.getUser()
      user = cookieUser
    } catch {
      user = null
    }

    const { data: matchedOrders } = await adminClient
      .from('orders')
      .select('*, order_items(*, product:products(id, title, category, material))')
      .or(buildOrderReferenceOrFilter(rawRef))
      .order('created_at', { ascending: false })
      .limit(1)

    const order: any =
      (matchedOrders && matchedOrders[0]) ||
      DEFAULT_ORDERS.find(
        (o) =>
          o.id === rawRef ||
          o.order_number?.toLowerCase() === rawRef.toLowerCase() ||
          o.tracking_barcode?.toLowerCase() === rawRef.toLowerCase()
      )

    if (!order) {
      return new NextResponse('Invoice not found for this order reference.', { status: 404 })
    }

    const isStaff =
      user?.app_metadata?.role === 'admin' ||
      user?.user_metadata?.role === 'admin'
    const isAuthorizedOwner = Boolean(user && (order.user_id === user.id || isStaff))

    const rawAddress = String(order.shipping_address || '')
    const displayAddress = isAuthorizedOwner
      ? rawAddress.replace(/\[Patron:[^\]]*\]/gi, '').trim() || 'India'
      : maskShippingAddress(rawAddress)

    const isIntraStateKarnataka =
      /karnataka|bengaluru|bangalore|560\d{3}/i.test(rawAddress)
    const isBolt =
      order.order_type === 'bolt_try_on' || order.delivery_mode === 'try_on'

    const items: any[] = order.order_items || []
    const relevantItems = isBolt
      ? items.filter((it) => it.try_on_decision === 'kept' || it.is_kept === true)
      : items
    const invoiceItems = relevantItems.length > 0 ? relevantItems : items

    const itemRowsHtml = invoiceItems
      .map((item, idx) => {
        const title = escapeHtml(item.product?.title || 'Maison TG Garment')
        const hsn = escapeHtml(item.hsn_code || '610910')
        const size = item.size ? `Size ${escapeHtml(String(item.size))}` : 'Standard'
        const qty = Number(item.quantity) || 1
        const unitPrice = Number(item.final_unit_price ?? item.unit_price ?? 0)
        const discountAmt = Number(item.discount_amount ?? 0)
        const taxable = Math.max(0, unitPrice * qty - discountAmt)
        const gstAmt = Number((taxable * 0.12).toFixed(2))
        const cgst = isIntraStateKarnataka ? (gstAmt / 2).toFixed(2) : '0.00'
        const sgst = isIntraStateKarnataka ? (gstAmt / 2).toFixed(2) : '0.00'
        const igst = !isIntraStateKarnataka ? gstAmt.toFixed(2) : '0.00'

        return `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${title}</strong><br/><span class="muted">${size}</span></td>
            <td class="mono">${hsn}</td>
            <td class="num">${qty}</td>
            <td class="num">₹${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="num">₹${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            ${
              isIntraStateKarnataka
                ? `<td class="num">₹${cgst} (6%)</td><td class="num">₹${sgst} (6%)</td>`
                : `<td class="num">₹${igst} (12%)</td>`
            }
            <td class="num"><strong>₹${(taxable + gstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
        `
      })
      .join('')

    const orderNum = escapeHtml(order.order_number || order.id)
    const invoiceNum = escapeHtml(
      order.invoice_number || `INV-2026-${orderNum.replace('ATL-', '')}`
    )
    const issuedDate = escapeHtml(formatIstTimestamp(order.created_at))
    const subtotalVal = Number(order.subtotal ?? order.original_total ?? 0)
    const discountVal = Number(order.applied_discount_amount ?? order.discount ?? 0)
    const shippingVal = Number(order.delivery_fee ?? order.shipping_fee ?? 0)
    const taxVal = Number(order.tax_amount ?? 0)
    const totalVal = Number(order.total_amount ?? order.total ?? 0)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tax Invoice ${invoiceNum} | Maison TG</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
      color: #14293a;
      background: #f5f5f4;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .sheet {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d3d6db;
      padding: 36px;
    }
    .toolbar {
      max-width: 860px;
      margin: 0 auto 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .btn {
      background: #14293a;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 2px;
    }
    .btn:hover { background: #b91c1c; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #14293a;
      padding-bottom: 18px;
      margin-bottom: 24px;
      gap: 16px;
    }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: -0.02em; }
    .eyebrow {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #6c7079;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .box {
      border: 1px solid #e5e7eb;
      background: #fafafa;
      padding: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f8f8f8;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #14293a;
    }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .muted { color: #6c7079; font-size: 11px; }
    .totals {
      margin-left: auto;
      width: 320px;
      border: 1px solid #d3d6db;
      padding: 14px 16px;
      background: #f8f8f8;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
    }
    .total-grand {
      border-top: 1px solid #14293a;
      margin-top: 8px;
      padding-top: 10px;
      font-weight: 800;
      font-size: 15px;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none; }
      .sheet { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="muted">GST Tax Invoice · ${invoiceNum}</span>
    <button type="button" class="btn" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">MAISON TG</div>
        <div class="muted">Maison TG Apparel Pvt. Ltd. · Indiranagar 100ft Rd, Bengaluru, KA 560038</div>
        <div class="muted mono">GSTIN: 29AABCM1234F1Z5 · HSN Chapter 61/62</div>
      </div>
      <div style="text-align:right">
        <div class="eyebrow">Tax Invoice</div>
        <div class="mono" style="font-weight:700;font-size:15px;">${invoiceNum}</div>
        <div class="muted">Order: ${orderNum}</div>
        <div class="muted">Issued: ${issuedDate}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="eyebrow" style="margin-bottom:6px;">Billed / Shipped To</div>
        <div>${escapeHtml(displayAddress)}</div>
      </div>
      <div class="box">
        <div class="eyebrow" style="margin-bottom:6px;">Fulfillment &amp; Supply Details</div>
        <div>Type: <strong>${isBolt ? 'Bolt 45-Min Doorstep Try-On' : 'Standard Express Dispatch'}</strong></div>
        <div>Place of Supply: <strong>${isIntraStateKarnataka ? 'Karnataka (29)' : 'Inter-State India'}</strong></div>
        <div>Tracking AWB: <span class="mono">${escapeHtml(order.tracking_barcode || 'PENDING')}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>HSN</th>
          <th class="num">Qty</th>
          <th class="num">Unit Rate</th>
          <th class="num">Taxable</th>
          ${
            isIntraStateKarnataka
              ? '<th class="num">CGST</th><th class="num">SGST</th>'
              : '<th class="num">IGST</th>'
          }
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Order Subtotal</span><span class="num">₹${subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ${discountVal > 0 ? `<div class="total-row" style="color:#047857;"><span>Promotional Discount</span><span class="num">-₹${discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
      <div class="total-row"><span>${isBolt ? 'Bolt Convenience Hold' : 'Delivery Fee'}</span><span class="num">₹${shippingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      <div class="total-row"><span>Total GST (12%)</span><span class="num">₹${taxVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ${isBolt ? `<div class="total-row"><span>Bolt Hold Credited Toward Kept Items</span><span class="num">₹${BOLT_HOLD_FEE.toFixed(2)}</span></div>` : ''}
      <div class="total-row total-grand"><span>Total Amount</span><span class="num">₹${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
    </div>

    <p class="muted" style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;">
      This is a computer-generated GST tax invoice issued by Maison TG Apparel Pvt. Ltd. For assistance, contact concierge@maisontg.com.
    </p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (err: any) {
    return new NextResponse(err?.message || 'Error generating invoice', { status: 500 })
  }
}
