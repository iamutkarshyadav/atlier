'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { Button, Barcode } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { getOrderById, type OrderWithItems } from '@repo/supabase/utils'

interface InvoicePageProps {
  params: { id: string }
}

export default function LuxuryInvoicePage({ params }: InvoicePageProps) {
  const orderId = params.id
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserClient()
        const found = await getOrderById(supabase, orderId)
        setOrder(found)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  // Trigger print if ?print=true is in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('print=true')) {
      const timer = setTimeout(() => {
        window.print()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-xs text-neutral-400 space-y-3">
        <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin rounded-full" />
        <p className="tracking-widest uppercase">Rendering Atelier Commercial Invoice...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-mono">
        <p className="text-rose-400 text-xs mb-4">Invoice for Order &ldquo;{orderId}&rdquo; Not Found.</p>
        <Link href="/orders">
          <Button variant="terminal" size="sm">
            ← Return to Order Manifest
          </Button>
        </Link>
      </div>
    )
  }

  const items = order.order_items || []
  const trackingCode = order.tracking_barcode || `ATL-TRK-${order.id.slice(0, 8).toUpperCase()}`
  const invoiceNum = order.invoice_number || `INV-2026-${order.id.slice(0, 4).toUpperCase()}`
  const isTryOn = order.delivery_mode === 'try_on'
  const recipientName = order.user?.name || (order.shipping_address ? order.shipping_address.split(',')[0] : 'Valued Patron')
  const recipientPhone = order.user?.phone || '+1 (415) 555-0192'

  return (
    <div className="min-h-screen bg-[#08080A] text-white py-8 px-4 sm:px-6 font-sans">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121216] border border-[#23232A] p-4 print:hidden">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Manifest
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <a
            href={`/api/invoice/generate?orderId=${order.id}&download=true`}
            className="flex-1 sm:flex-initial"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-[#1A1A22] border-[#2E2E3A] text-neutral-200 text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
          </a>

          <Button
            variant="terminal"
            size="sm"
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Packing Slip
          </Button>
        </div>
      </div>

      {/* Printable Invoice Container (Monochrome Ultra-Luxury Sheet) */}
      <div className="max-w-4xl mx-auto bg-white text-black p-8 sm:p-12 shadow-2xl border border-neutral-300 print:border-none print:shadow-none print:p-0 print:max-w-none">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-8 flex flex-col sm:flex-row justify-between items-start gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-mono text-neutral-500 block">
              MAISON DE CRÉATION HAUTE COUTURE
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-black uppercase tracking-tight text-black mt-1">
              ATELIER GUSTAVO
            </h1>
            <p className="text-xs text-neutral-600 font-serif italic mt-0.5">
              42 Rue de Sèvres, 75007 Paris • France • contact@ateliergustavo.com
            </p>
          </div>

          <div className="text-left sm:text-right font-mono text-xs space-y-1">
            <span className="inline-block px-2 py-0.5 bg-black text-white text-[10px] font-bold tracking-widest uppercase mb-1">
              OFFICIAL COMMERCIAL INVOICE
            </span>
            <p className="font-black text-sm text-black">INVOICE: {invoiceNum}</p>
            <p className="text-neutral-600 text-[11px]">
              ORDER REF: {order.order_number || `ATL-${order.id.slice(0, 6).toUpperCase()}`}
            </p>
            <p className="text-neutral-600 text-[11px]">
              DATE: {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'October 25, 2026'}
            </p>
          </div>
        </div>

        {/* Patron Coordinates & Dispatch Manifest Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-black/20 text-xs font-sans">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
              BILLED & DISPATCHED TO
            </span>
            <p className="text-sm font-bold text-black font-serif">{recipientName}</p>
            <p className="text-neutral-700 leading-relaxed">
              {order.shipping_address || '742 Evergreen Terrace, Studio 4B, San Francisco, CA 94107'}
            </p>
            <p className="text-neutral-600 font-mono text-[11px]">Contact: {recipientPhone}</p>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold block font-sans">
              FULFILLMENT LOGISTICS
            </span>
            <div className="flex justify-between border-b border-black/10 py-1">
              <span className="text-neutral-600">Experience Mode:</span>
              <span className="font-bold">
                {isTryOn ? 'Mode B: 45m Doorstep Try-On Fitting' : 'Mode A: Direct Atelier Hand-Off'}
              </span>
            </div>
            <div className="flex justify-between border-b border-black/10 py-1">
              <span className="text-neutral-600">Settlement Verification:</span>
              <span className="font-bold">
                {order.try_on_status === 'reconciled' ? 'Finalized by Courier' : 'Direct Dispatch'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-600">Tracking Reference:</span>
              <span className="font-bold">{trackingCode}</span>
            </div>
          </div>
        </div>

        {/* Granular Try-On Line Item Reconciliation */}
        <div className="py-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
              LINE-ITEM TRY-ON RECONCILIATION DOSSIER
            </span>
            <span className="text-[11px] font-mono text-neutral-600">
              {items.length} Curated Pieces
            </span>
          </div>

          <table className="w-full text-left text-xs border border-black/20">
            <thead className="bg-black text-white uppercase text-[9px] font-mono tracking-wider">
              <tr>
                <th className="p-3">Garment Piece & Silhouette</th>
                <th className="p-3 text-center">Size Matrix</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-center">Try-On Outcome</th>
                <th className="p-3 text-right">Realized Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-sans">
              {items.map((item) => {
                const isKept = item.is_kept === true
                const isReturned = item.is_kept === false
                const isPending = item.is_kept === null
                const lineTotal = isKept ? Number(item.unit_price) * (item.quantity || 1) : 0

                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {item.product?.image_url && (
                          <div className="relative w-8 h-10 bg-neutral-100 border border-neutral-300 overflow-hidden flex-shrink-0">
                            <Image
                              src={item.product.image_url}
                              alt={item.product.title || 'Work'}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-black font-serif text-sm">
                            {item.product?.title || 'Atelier Bespoke Piece'}
                          </p>
                          <p className="text-[10px] text-neutral-600">
                            {item.product?.material || '100% Organic French Terry'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-center font-mono text-xs">
                      <span className="font-bold">{item.size || 'M'}</span> × {item.quantity || 1}
                    </td>

                    <td className="p-3 text-right font-mono text-neutral-800">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>

                    <td className="p-3 text-center font-mono">
                      {isKept ? (
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                          ✓ Kept by Patron
                        </span>
                      ) : isReturned ? (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-bold uppercase tracking-wider">
                            ✕ Returned
                          </span>
                          {item.rejection_reason && (
                            <p className="text-[10px] text-neutral-600 italic font-sans max-w-xs mx-auto">
                              &ldquo;{item.rejection_reason}&rdquo;
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider">
                          Fitting Pending
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-black text-sm">
                      {isReturned ? (
                        <span className="text-neutral-400 line-through">$0.00</span>
                      ) : (
                        `$${lineTotal.toFixed(2)}`
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Financial Breakdown */}
        <div className="flex justify-end pt-4 pb-8">
          <div className="w-full sm:w-80 space-y-2 text-xs font-mono border-t-2 border-black pt-4">
            <div className="flex justify-between text-neutral-600">
              <span>Gross Order Value:</span>
              <span className="font-bold">${Number(order.original_total || order.total).toFixed(2)}</span>
            </div>

            {order.original_total && order.original_total > order.total && (
              <div className="flex justify-between text-rose-600">
                <span>Returned Items Credit:</span>
                <span className="font-bold">
                  -${(Number(order.original_total) - Number(order.total)).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600">
              <span>VAT / Sales Tax (8.5%):</span>
              <span className="font-bold">${Number(order.tax_amount || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>White-Glove Courier Logistics:</span>
              <span className="font-bold text-emerald-700">
                {Number(order.shipping_fee) > 0 ? `$${Number(order.shipping_fee).toFixed(2)}` : 'Complimentary'}
              </span>
            </div>

            <div className="flex justify-between border-t-2 border-black pt-3 text-sm font-black text-black">
              <span className="uppercase">Net Realized Total:</span>
              <span className="text-base">${Number(order.total).toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Embedded Code 128 Tracking & Dispatch Barcode */}
        <div className="pt-8 border-t border-black/20 flex flex-col items-center justify-center space-y-2">
          <Barcode
            value={trackingCode}
            height={46}
            width={1.6}
            theme="print"
            displayValue={true}
          />
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
            LOGISTICS DISPATCH SYMBOLOGY • CODE 128 SUBSET B
          </span>
        </div>

        {/* Legal Atelier Footer */}
        <div className="mt-8 pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-neutral-500 gap-2">
          <span>Atelier Gustavo SAS • SIRET 849 201 392 00018 • TVA FR 32 849201392</span>
          <span>Certified Commercial Invoice • Preserved on Atelier Cloud</span>
        </div>
      </div>
    </div>
  )
}
