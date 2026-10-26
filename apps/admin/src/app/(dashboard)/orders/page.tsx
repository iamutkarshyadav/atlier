'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Button,
  Barcode,
} from '@repo/ui'
import {
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  ExternalLink,
  Package,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getAllOrders,
  getDeliveryCouriers,
  updateOrderStatus,
  assignOrderCourier,
  type OrderWithItems,
  type UserProfile,
  type OrderStatus,
} from '@repo/supabase/utils'

export default function LuxuryAdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [couriers, setCouriers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null)
  const prevCountRef = React.useRef<number>(0)

  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    try {
      // 1. Fetch from unified server API route (combines DB + live ledger)
      let fetchedOrders: OrderWithItems[] = []
      try {
        const res = await fetch('/api/orders')
        const data = await res.json()
        if (data.success && Array.isArray(data.orders)) {
          fetchedOrders = data.orders
        }
      } catch {}

      // 2. Fetch couriers and fallback orders
      const supabase = createBrowserClient()
      const [dbOrders, allCouriers] = await Promise.all([
        fetchedOrders.length === 0 ? getAllOrders(supabase) : Promise.resolve(fetchedOrders),
        getDeliveryCouriers(supabase),
      ])

      const finalOrders = fetchedOrders.length > 0 ? fetchedOrders : dbOrders
      
      // Check if new orders arrived
      if (prevCountRef.current > 0 && finalOrders.length > prevCountRef.current) {
        const newest = finalOrders[0]
        setNewOrderAlert(`New Patron Order Received: ${newest?.order_number || 'ATL-ORD'} ($${newest?.total})`)
        setTimeout(() => setNewOrderAlert(null), 5000)
      }
      prevCountRef.current = finalOrders.length

      setOrders(finalOrders)
      setCouriers(allCouriers)
    } finally {
      if (!isBackground) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData(false)

    // 1. High-frequency live polling for instant cross-tab storefront synchronization
    const pollInterval = setInterval(() => {
      loadData(true)
    }, 3000)

    // 2. PostgreSQL realtime channel listener
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('admin_realtime_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData(true)
      })
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(id)
    setOrders((prev) =>
      prev.map((ord) => (ord.id === id ? { ...ord, status: newStatus } : ord))
    )

    // Sync via API route
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, status: newStatus }),
      })
    } catch {}

    const supabase = createBrowserClient()
    const { success, error } = await updateOrderStatus(supabase, id, newStatus)
    if (!success) {
      setFeedback(`Status update error: ${error}`)
    } else {
      setFeedback(`Order ${id.slice(0, 8)} status set to ${newStatus}`)
    }
    setUpdatingOrderId(null)
  }

  const handleAssignCourier = async (orderId: string, courierId: string) => {
    const assignedCourierId = courierId === 'unassigned' ? null : courierId
    setUpdatingOrderId(orderId)

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              delivery_partner_id: assignedCourierId,
              status: assignedCourierId && ord.status === 'pending' ? 'processing' : ord.status,
            }
          : ord
      )
    )

    // Sync via API route
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, courierId: assignedCourierId }),
      })
    } catch {}

    const supabase = createBrowserClient()
    const { success, error } = await assignOrderCourier(supabase, orderId, assignedCourierId)
    if (!success) {
      setFeedback(`Courier assign error: ${error}`)
    } else {
      const courierName = couriers.find((c) => c.id === assignedCourierId)?.name || 'Courier'
      setFeedback(`Assigned order to ${courierName}. Synchronized to courier manifest!`)
    }
    setUpdatingOrderId(null)
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#23232A] pb-6">
        <div>
          <span className="text-[10px] tracking-caps uppercase text-neutral-400 block font-medium">
            LOGISTICS & TRY-ON RECONCILIATION DOSSIER
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mt-1">
            Order Manifest
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Real-time fulfillment tracking, 45-minute doorstep Try-On item settlements, tracking barcodes, and official VAT invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE SYNC ACTIVE</span>
          </div>

          <Button
            variant="terminal"
            size="sm"
            onClick={() => loadData(false)}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {newOrderAlert && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-500 text-emerald-300 text-xs flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold tracking-wide">{newOrderAlert}</span>
          </div>
          <button onClick={() => setNewOrderAlert(null)} className="text-emerald-400 hover:text-white font-bold text-sm">×</button>
        </div>
      )}

      {feedback && (
        <div className="p-3 bg-neutral-900 border border-[#333333] text-amber-300 text-xs flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-neutral-500 hover:text-white">×</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="border border-[#23232A] bg-[#0E0E11] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#23232A] hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead>Order & Invoice</TableHead>
              <TableHead>Experience Mode</TableHead>
              <TableHead>Destination Address</TableHead>
              <TableHead>Try-On Settlement</TableHead>
              <TableHead>Realized Total</TableHead>
              <TableHead>Milestone Status</TableHead>
              <TableHead className="text-right">Assign Dedicated Courier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((ord) => {
              const matchedCourier = couriers.find((c) => c.id === ord.delivery_partner_id)
              const isExpanded = expandedOrderId === ord.id
              const items = ord.order_items || []
              const keptCount = items.filter((i) => i.is_kept === true).length
              const returnedCount = items.filter((i) => i.is_kept === false).length
              const pendingCount = items.filter((i) => i.is_kept === null).length
              const trackingCode = ord.tracking_barcode || `ATL-TRK-${ord.id.slice(0, 8).toUpperCase()}`
              const invoiceNum = ord.invoice_number || `INV-2026-${ord.id.slice(0, 4).toUpperCase()}`

              return (
                <React.Fragment key={ord.id}>
                  <TableRow
                    className={`border-b border-[#1A1A20] hover:bg-[#131317] transition-colors cursor-pointer ${
                      isExpanded ? 'bg-[#141419]' : ''
                    }`}
                    onClick={() => toggleExpand(ord.id)}
                  >
                    <TableCell className="p-2 text-center text-neutral-500">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mx-auto" />
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs block">
                            {ord.order_number || `ATL-${ord.id.slice(0, 6).toUpperCase()}`}
                          </span>
                          <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.2">
                            {invoiceNum}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono block">
                          {ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`text-[10px] px-2 py-0.5 border ${
                          ord.delivery_mode === 'try_on'
                            ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                        }`}
                      >
                        {ord.delivery_mode === 'try_on' ? 'Mode B: 45m Try-On' : 'Mode A: Direct'}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-neutral-300 max-w-xs font-sans">
                      <p className="truncate">{ord.shipping_address || 'Studio Collection'}</p>
                      {ord.delivery_notes && (
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">{ord.delivery_notes}</p>
                      )}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {ord.delivery_mode === 'try_on' ? (
                        <div className="space-y-1 text-xs">
                          {ord.try_on_status === 'reconciled' || ord.try_on_status === 'completed' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-1.5 py-0.5">
                                Reconciled: {keptCount} kept / {returnedCount} ret
                              </span>
                            </div>
                          ) : ord.try_on_status === 'fitting_in_progress' ? (
                            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800 px-1.5 py-0.5 animate-pulse">
                              Fitting In Progress (45m)
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5">
                              Awaiting Salon Doorstep
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Direct Purchase (No Try-On)</span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs font-semibold text-white">
                      <div>${Number(ord.total).toFixed(2)}</div>
                      {ord.original_total && ord.original_total !== ord.total && (
                        <div className="text-[10px] text-neutral-500 line-through">
                          Orig: ${Number(ord.original_total).toFixed(2)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                        className="bg-[#18181C] border border-[#2B2B33] text-[11px] text-white px-2 py-1 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Studio Pack</option>
                        <option value="out_for_delivery">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={ord.delivery_partner_id || 'unassigned'}
                          onChange={(e) => handleAssignCourier(ord.id, e.target.value)}
                          className="bg-[#18181C] border border-[#2B2B33] text-[11px] text-white px-2 py-1 focus:border-amber-400 focus:outline-none max-w-[170px]"
                        >
                          <option value="unassigned">— Unassigned —</option>
                          {couriers.map((courier) => (
                            <option key={courier.id} value={courier.id}>
                              {courier.name}
                            </option>
                          ))}
                        </select>

                        {updatingOrderId === ord.id && (
                          <span className="text-[10px] text-amber-400 animate-pulse">Syncing</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Dossier Row */}
                  {isExpanded && (
                    <TableRow className="bg-[#101015] border-b border-[#23232A]">
                      <TableCell colSpan={8} className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Column 1: Barcode & Logistics Dispatch */}
                          <div className="p-4 bg-[#0A0A0D] border border-[#23232A] space-y-4">
                            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-2">
                              <span className="text-[10px] uppercase tracking-caps text-neutral-400">
                                Logistics Dispatch Barcode
                              </span>
                              <Badge variant="terminal" className="text-amber-400 border-amber-900/40 text-[9px]">
                                Code 128
                              </Badge>
                            </div>

                            <div className="bg-[#050507] p-3 border border-[#1A1A22] flex flex-col items-center justify-center">
                              <Barcode
                                value={trackingCode}
                                height={42}
                                width={1.4}
                                theme="terminal"
                                displayValue={true}
                              />
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Tracking Code:</span>
                                <span className="text-white font-mono">{trackingCode}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Official Invoice:</span>
                                <span className="text-amber-300 font-mono">{invoiceNum}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Courier Assigned:</span>
                                <span className="text-white">
                                  {matchedCourier?.name || 'Unassigned (Dispatch Pending)'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-[#1E1E26] flex gap-2">
                              <Link
                                href={`/invoice/${ord.id}`}
                                target="_blank"
                                className="flex-1"
                              >
                                <Button
                                  variant="terminal"
                                  size="sm"
                                  className="w-full text-xs flex items-center justify-center gap-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5" /> View Invoice
                                </Button>
                              </Link>
                              <Link
                                href={`/invoice/${ord.id}?print=true`}
                                target="_blank"
                                className="flex-1"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs bg-neutral-900 border-neutral-700 text-neutral-200 flex items-center justify-center gap-1.5"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Packing Slip
                                </Button>
                              </Link>
                            </div>
                          </div>

                          {/* Column 2 & 3: Try-On Granular Line-Item Reconciliation */}
                          <div className="lg:col-span-2 p-4 bg-[#0A0A0D] border border-[#23232A] space-y-4">
                            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-2">
                              <div>
                                <span className="text-[10px] uppercase tracking-caps text-neutral-400 block">
                                  45-Minute Doorstep Try-On Item Reconciliation
                                </span>
                                <span className="text-xs text-neutral-300">
                                  Line-item outcome verified by delivery officer during salon fitting session
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-neutral-400">
                                {items.length} Curated Works
                              </span>
                            </div>

                            {/* Line Items Table */}
                            <div className="border border-[#1A1A22] overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-[#121218] border-b border-[#1A1A22] text-[10px] uppercase text-neutral-400">
                                  <tr>
                                    <th className="p-2.5">Garment Piece</th>
                                    <th className="p-2.5">Size & Units</th>
                                    <th className="p-2.5">Price</th>
                                    <th className="p-2.5">Reconciliation Outcome</th>
                                    <th className="p-2.5 text-right">Settled Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1A1A22]">
                                  {items.map((item) => {
                                    const isKept = item.is_kept === true
                                    const isReturned = item.is_kept === false
                                    const isPending = item.is_kept === null
                                    const lineTotal = isKept
                                      ? Number(item.unit_price) * (item.quantity || 1)
                                      : 0

                                    return (
                                      <tr key={item.id} className="hover:bg-[#0D0D11]">
                                        <td className="p-2.5">
                                          <div className="flex items-center gap-3">
                                            <div className="relative w-8 h-10 bg-black border border-[#2A2A33] overflow-hidden flex-shrink-0">
                                              {item.product?.image_url && (
                                                <Image
                                                  src={item.product.image_url}
                                                  alt={item.product.title || 'Work'}
                                                  fill
                                                  className="object-cover"
                                                  sizes="32px"
                                                />
                                              )}
                                            </div>
                                            <div>
                                              <p className="font-semibold text-white text-xs">
                                                {item.product?.title || 'Bespoke Atelier Work'}
                                              </p>
                                              <p className="text-[10px] text-neutral-500">
                                                {item.product?.material || '100% Organic French Terry'}
                                              </p>
                                            </div>
                                          </div>
                                        </td>

                                        <td className="p-2.5 font-mono text-[11px]">
                                          <span className="text-amber-300 font-semibold">{item.size || 'M'}</span>
                                          <span className="text-neutral-500"> × {item.quantity || 1}</span>
                                        </td>

                                        <td className="p-2.5 font-mono text-neutral-300">
                                          ${Number(item.unit_price).toFixed(2)}
                                        </td>

                                        <td className="p-2.5">
                                          {isKept ? (
                                            <div className="flex items-center gap-1.5 text-emerald-400">
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-0.5">
                                                Kept by Patron
                                              </span>
                                            </div>
                                          ) : isReturned ? (
                                            <div className="space-y-0.5 text-rose-400">
                                              <div className="flex items-center gap-1.5">
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-950/40 border border-rose-900/60 px-1.5 py-0.5">
                                                  Returned to Atelier
                                                </span>
                                              </div>
                                              {item.rejection_reason && (
                                                <p className="text-[10px] text-neutral-400 font-sans italic pl-5">
                                                  &ldquo;{item.rejection_reason}&rdquo;
                                                </p>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5 text-amber-400">
                                              <Clock className="w-3.5 h-3.5" />
                                              <span className="text-[10px] uppercase tracking-wider bg-amber-950/40 border border-amber-900/60 px-1.5 py-0.5">
                                                Fitting Pending
                                              </span>
                                            </div>
                                          )}
                                        </td>

                                        <td className="p-2.5 text-right font-mono font-semibold text-white">
                                          {isReturned ? (
                                            <span className="text-neutral-500 line-through">$0.00</span>
                                          ) : (
                                            `$${(Number(item.unit_price) * (item.quantity || 1)).toFixed(2)}`
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Settlement Summary Calculation */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                              <div className="p-2.5 bg-[#121218] border border-[#1A1A22]">
                                <span className="text-[10px] text-neutral-500 block uppercase">Gross Order</span>
                                <span className="font-mono text-white font-semibold">
                                  ${Number(ord.original_total || ord.total).toFixed(2)}
                                </span>
                              </div>
                              <div className="p-2.5 bg-[#121218] border border-[#1A1A22]">
                                <span className="text-[10px] text-neutral-500 block uppercase">VAT / Tax (8.5%)</span>
                                <span className="font-mono text-white font-semibold">
                                  ${Number(ord.tax_amount || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="p-2.5 bg-[#121218] border border-[#1A1A22]">
                                <span className="text-[10px] text-neutral-500 block uppercase">Logistics Fee</span>
                                <span className="font-mono text-emerald-400 font-semibold">
                                  {Number(ord.shipping_fee) > 0 ? `$${Number(ord.shipping_fee).toFixed(2)}` : 'Complimentary'}
                                </span>
                              </div>
                              <div className="p-2.5 bg-amber-950/20 border border-amber-900/40">
                                <span className="text-[10px] text-amber-300 block uppercase font-bold">Net Realized Total</span>
                                <span className="font-mono text-amber-200 font-bold text-sm">
                                  ${Number(ord.total).toFixed(2)}
                                </span>
                              </div>
                            </div>

                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}

            {orders.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-xs text-neutral-500">
                  No active orders in manifest. When patrons complete checkout on Storefront, orders appear here in real-time.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
