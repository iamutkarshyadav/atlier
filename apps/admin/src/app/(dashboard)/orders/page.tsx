'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  ExternalLink,
  Package,
  Search,
  MapPin,
  Store,
  Globe,
  ShoppingBag,
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

type ChannelType = 'all' | 'online_direct' | 'bolt_tryon' | 'pos' | 'endless_aisle'

function getOrderChannel(ord: OrderWithItems): ChannelType {
  const ordNum = ord.order_number || ''
  if (ordNum.startsWith('POS-') || ordNum.startsWith('RCP-')) {
    return 'pos'
  }
  if (ord.delivery_notes?.toLowerCase().includes('endless') || (ord as any).is_endless_aisle) {
    return 'endless_aisle'
  }
  if (ord.delivery_mode === 'try_on') {
    return 'bolt_tryon'
  }
  return 'online_direct'
}

function getOrderLocation(ord: OrderWithItems): string {
  if ((ord as any).location_code) return (ord as any).location_code
  if (ord.order_number?.startsWith('POS-')) return 'BLR-ST01'
  return 'BLR-WH01'
}

export default function LuxuryAdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [couriers, setCouriers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
        setNewOrderAlert(`New Order Received: ${newest?.order_number || 'ATL-ORD'} ($${newest?.total})`)
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

    // 1. Live polling for instant cross-tab synchronization
    const pollInterval = setInterval(() => {
      loadData(true)
    }, 4000)

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
      setFeedback(`Assigned order to ${courierName}`)
    }
    setUpdatingOrderId(null)
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  // Channel Counts
  const channelCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      online_direct: 0,
      bolt_tryon: 0,
      pos: 0,
      endless_aisle: 0,
    }
    orders.forEach((ord) => {
      const ch = getOrderChannel(ord)
      if (counts[ch] !== undefined) {
        counts[ch]++
      }
    })
    return counts
  }, [orders])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Channel Filter
      if (selectedChannel !== 'all') {
        const ch = getOrderChannel(ord)
        if (ch !== selectedChannel) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const ordNum = (ord.order_number || '').toLowerCase()
        const invNum = (ord.invoice_number || '').toLowerCase()
        const addr = (ord.shipping_address || '').toLowerCase()
        const trk = (ord.tracking_barcode || '').toLowerCase()
        return (
          ordNum.includes(query) ||
          invNum.includes(query) ||
          addr.includes(query) ||
          trk.includes(query)
        )
      }

      return true
    })
  }, [orders, selectedChannel, searchQuery])

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            <span>Order Manifest & Omnichannel Dossier</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Real-time fulfillment tracking across Online Direct, Doorstep Try-On, Boutique POS, and Endless Aisle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-chrome-900 border border-chrome-750 text-emerald-400 text-3xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Realtime Sync: Connected</span>
          </div>

          <Button
            variant="terminal"
            size="sm"
            onClick={() => loadData(false)}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {newOrderAlert && (
        <div className="p-3 bg-chrome-850 border border-emerald-500/80 text-emerald-300 text-xs flex justify-between items-center shadow-lg">
          <span className="font-bold">{newOrderAlert}</span>
          <button onClick={() => setNewOrderAlert(null)} className="text-emerald-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {feedback && (
        <div className="p-2.5 bg-chrome-900 border border-chrome-700 text-amber-300 text-xs flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-white ml-4">
            ×
          </button>
        </div>
      )}

      {/* Channel Filter Pills & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Channel Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-2xs">
          <button
            onClick={() => setSelectedChannel('all')}
            className={`px-2.5 py-1 border transition-colors ${
              selectedChannel === 'all'
                ? 'bg-chrome-800 text-zinc-100 border-chrome-600 font-bold'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
          >
            All Channels ({channelCounts.all})
          </button>

          <button
            onClick={() => setSelectedChannel('online_direct')}
            className={`flex items-center gap-1 px-2.5 py-1 border transition-colors ${
              selectedChannel === 'online_direct'
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800 font-bold'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Online Direct ({channelCounts.online_direct})</span>
          </button>

          <button
            onClick={() => setSelectedChannel('bolt_tryon')}
            className={`flex items-center gap-1 px-2.5 py-1 border transition-colors ${
              selectedChannel === 'bolt_tryon'
                ? 'bg-amber-950/40 text-amber-300 border-amber-800 font-bold'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Bolt 45m Try-On ({channelCounts.bolt_tryon})</span>
          </button>

          <button
            onClick={() => setSelectedChannel('pos')}
            className={`flex items-center gap-1 px-2.5 py-1 border transition-colors ${
              selectedChannel === 'pos'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 font-bold'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>Offline POS ({channelCounts.pos})</span>
          </button>

          <button
            onClick={() => setSelectedChannel('endless_aisle')}
            className={`flex items-center gap-1 px-2.5 py-1 border transition-colors ${
              selectedChannel === 'endless_aisle'
                ? 'bg-purple-950/40 text-purple-300 border-purple-800 font-bold'
                : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Endless Aisle ({channelCounts.endless_aisle})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search order, invoice, patron..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-chrome-950 border border-chrome-800 pl-8 pr-3 py-1 text-2xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-chrome-700"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-chrome-800 bg-chrome-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="w-8 py-2.5 px-2 text-center"></th>
              <th className="py-2.5 px-3 text-left font-semibold">Order & Invoice</th>
              <th className="py-2.5 px-3 text-left font-semibold">Channel & Hub</th>
              <th className="py-2.5 px-3 text-left font-semibold">Destination Address</th>
              <th className="py-2.5 px-3 text-left font-semibold">Try-On Settlement</th>
              <th className="py-2.5 px-3 text-right font-semibold">Total Amount</th>
              <th className="py-2.5 px-3 text-left font-semibold">Milestone Status</th>
              <th className="py-2.5 px-3 text-right font-semibold">Dedicated Courier</th>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((ord) => {
              const matchedCourier = couriers.find((c) => c.id === ord.delivery_partner_id)
              const isExpanded = expandedOrderId === ord.id
              const items = ord.order_items || []
              const keptCount = items.filter((i) => i.is_kept === true).length
              const returnedCount = items.filter((i) => i.is_kept === false).length
              const trackingCode = ord.tracking_barcode || `ATL-TRK-${ord.id.slice(0, 8).toUpperCase()}`
              const invoiceNum = ord.invoice_number || `INV-2026-${ord.id.slice(0, 4).toUpperCase()}`
              const channel = getOrderChannel(ord)
              const locationCode = getOrderLocation(ord)

              return (
                <React.Fragment key={ord.id}>
                  <TableRow
                    className={`border-b border-chrome-800 hover:bg-chrome-850 transition-colors cursor-pointer ${
                      isExpanded ? 'bg-chrome-850/50' : ''
                    }`}
                    onClick={() => toggleExpand(ord.id)}
                  >
                    <TableCell className="p-2 text-center text-zinc-500">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-cyan-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 mx-auto" />
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-100 text-xs tabular-nums block">
                            {ord.order_number || `ATL-${ord.id.slice(0, 6).toUpperCase()}`}
                          </span>
                          <span className="text-3xs bg-chrome-950 border border-chrome-750 text-zinc-400 px-1 py-0.2 font-mono">
                            {invoiceNum}
                          </span>
                        </div>
                        <span className="text-3xs text-zinc-500 font-mono block">
                          {ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {/* Channel Badge */}
                        <span
                          className={`text-3xs px-1.5 py-0.5 border uppercase font-semibold ${
                            channel === 'bolt_tryon'
                              ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                              : channel === 'pos'
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                              : channel === 'endless_aisle'
                              ? 'bg-purple-950/40 border-purple-800 text-purple-300'
                              : 'bg-chrome-950 border-chrome-750 text-zinc-300'
                          }`}
                        >
                          {channel === 'bolt_tryon'
                            ? '45m Try-On'
                            : channel === 'pos'
                            ? 'Boutique POS'
                            : channel === 'endless_aisle'
                            ? 'Endless Aisle'
                            : 'Online Direct'}
                        </span>

                        {/* Location Hub Badge */}
                        <span className="text-3xs px-1.5 py-0.5 bg-chrome-950 border border-cyan-800/60 text-cyan-300 font-bold tabular-nums">
                          {locationCode}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5 px-3 text-2xs text-zinc-300 max-w-xs font-sans">
                      <p className="truncate">{ord.shipping_address || 'Studio Collection'}</p>
                      {ord.delivery_notes && (
                        <p className="text-3xs text-zinc-500 truncate mt-0.5 font-mono">{ord.delivery_notes}</p>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      {ord.delivery_mode === 'try_on' ? (
                        <div className="space-y-1 text-2xs">
                          {ord.try_on_status === 'reconciled' || ord.try_on_status === 'completed' ? (
                            <span className="text-3xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-1.5 py-0.5">
                              Reconciled: {keptCount} kept / {returnedCount} ret
                            </span>
                          ) : ord.try_on_status === 'fitting_in_progress' ? (
                            <span className="text-3xs text-amber-300 bg-amber-950/40 border border-amber-800 px-1.5 py-0.5 font-semibold">
                              Fitting In Progress (45m)
                            </span>
                          ) : (
                            <span className="text-3xs text-zinc-400 bg-chrome-950 border border-chrome-750 px-1.5 py-0.5">
                              Awaiting Salon Doorstep
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-3xs text-zinc-500">Direct Purchase</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3 text-right font-mono text-xs font-bold text-zinc-100 tabular-nums">
                      <div>${Number(ord.total).toFixed(2)}</div>
                      {ord.original_total && ord.original_total !== ord.total && (
                        <div className="text-3xs text-zinc-500 line-through">
                          Orig: ${Number(ord.original_total).toFixed(2)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                        className="bg-chrome-950 border border-chrome-750 text-2xs text-zinc-100 px-2 py-1 focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Pack In Progress</option>
                        <option value="out_for_delivery">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </TableCell>

                    <TableCell className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={ord.delivery_partner_id || 'unassigned'}
                          onChange={(e) => handleAssignCourier(ord.id, e.target.value)}
                          className="bg-chrome-950 border border-chrome-750 text-2xs text-zinc-100 px-2 py-1 focus:border-cyan-400 focus:outline-none max-w-[150px]"
                        >
                          <option value="unassigned">— Unassigned —</option>
                          {couriers.map((courier) => (
                            <option key={courier.id} value={courier.id}>
                              {courier.name}
                            </option>
                          ))}
                        </select>

                        {updatingOrderId === ord.id && (
                          <span className="text-3xs text-amber-400 font-semibold">Syncing</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Dossier Row */}
                  {isExpanded && (
                    <TableRow className="bg-chrome-950/80 border-b border-chrome-800">
                      <TableCell colSpan={8} className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Column 1: Barcode & Logistics Dispatch */}
                          <div className="p-3 bg-chrome-900 border border-chrome-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-chrome-800 pb-1.5">
                              <span className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold">
                                Logistics Dispatch Barcode
                              </span>
                              <span className="text-3xs bg-chrome-950 border border-cyan-800 text-cyan-400 px-1.5 py-0.2">
                                Code 128
                              </span>
                            </div>

                            <div className="bg-white p-3 flex flex-col items-center justify-center">
                              <Barcode
                                value={trackingCode}
                                height={40}
                                width={1.4}
                                theme="print"
                                displayValue={true}
                              />
                            </div>

                            <div className="space-y-1 text-2xs">
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Tracking Code:</span>
                                <span className="text-zinc-200 font-mono">{trackingCode}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Official Invoice:</span>
                                <span className="text-amber-300 font-mono">{invoiceNum}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Fulfilling Hub:</span>
                                <span className="text-cyan-300 font-bold">{locationCode}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Courier Assigned:</span>
                                <span className="text-zinc-200">
                                  {matchedCourier?.name || 'Unassigned (Dispatch Pending)'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-chrome-800 flex gap-2">
                              <Link
                                href={`/invoice/${ord.id}`}
                                target="_blank"
                                className="flex-1"
                              >
                                <Button
                                  variant="terminal"
                                  size="sm"
                                  className="w-full text-2xs flex items-center justify-center gap-1.5"
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
                                  className="w-full text-2xs bg-chrome-800 border-chrome-700 text-zinc-200 flex items-center justify-center gap-1.5"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Packing Slip
                                </Button>
                              </Link>
                            </div>
                          </div>

                          {/* Column 2 & 3: Try-On Granular Line-Item Reconciliation */}
                          <div className="lg:col-span-2 p-3 bg-chrome-900 border border-chrome-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-chrome-800 pb-1.5">
                              <div>
                                <span className="text-3xs uppercase tracking-wider text-zinc-400 block font-semibold">
                                  Curated Order Line Items ({items.length})
                                </span>
                                <span className="text-2xs text-zinc-300">
                                  {ord.delivery_mode === 'try_on'
                                    ? 'Line-item outcome verified by delivery officer during doorstep fitting session'
                                    : 'Fulfillment order pieces picked and packed for direct delivery'}
                                </span>
                              </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="border border-chrome-800 overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-chrome-950 border-b border-chrome-800 text-3xs uppercase text-zinc-400">
                                  <tr>
                                    <th className="p-2">Garment Piece</th>
                                    <th className="p-2">Size & Units</th>
                                    <th className="p-2">Price</th>
                                    <th className="p-2">Outcome</th>
                                    <th className="p-2 text-right">Settled Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-chrome-800">
                                  {items.map((item) => {
                                    const isKept = item.is_kept === true
                                    const isReturned = item.is_kept === false
                                    const lineTotal = isKept
                                      ? Number(item.unit_price) * (item.quantity || 1)
                                      : 0

                                    return (
                                      <tr key={item.id} className="hover:bg-chrome-850">
                                        <td className="p-2">
                                          <div className="flex items-center gap-2">
                                            <div className="relative w-7 h-9 bg-black border border-chrome-750 overflow-hidden shrink-0">
                                              {item.product?.image_url && (
                                                <Image
                                                  src={item.product.image_url}
                                                  alt={item.product.title || 'Work'}
                                                  fill
                                                  unoptimized
                                                  className="object-cover"
                                                  sizes="28px"
                                                />
                                              )}
                                            </div>
                                            <div>
                                              <p className="font-semibold text-zinc-100 text-2xs">
                                                {item.product?.title || 'Bespoke Atelier Work'}
                                              </p>
                                              <p className="text-3xs text-zinc-500">
                                                {item.product?.material || '100% Organic French Terry'}
                                              </p>
                                            </div>
                                          </div>
                                        </td>

                                        <td className="p-2 font-mono text-2xs">
                                          <span className="text-amber-300 font-bold">{item.size || 'M'}</span>
                                          <span className="text-zinc-500"> × {item.quantity || 1}</span>
                                        </td>

                                        <td className="p-2 font-mono text-zinc-300 text-2xs tabular-nums">
                                          ${Number(item.unit_price).toFixed(2)}
                                        </td>

                                        <td className="p-2 text-2xs">
                                          {isKept ? (
                                            <div className="flex items-center gap-1 text-emerald-400">
                                              <CheckCircle2 className="w-3 h-3" />
                                              <span className="text-3xs font-bold uppercase bg-emerald-950/40 border border-emerald-900/60 px-1 py-0.5">
                                                Kept
                                              </span>
                                            </div>
                                          ) : isReturned ? (
                                            <div className="space-y-0.5 text-rose-400">
                                              <div className="flex items-center gap-1">
                                                <XCircle className="w-3 h-3" />
                                                <span className="text-3xs font-bold uppercase bg-rose-950/40 border border-rose-900/60 px-1 py-0.5">
                                                  Returned
                                                </span>
                                              </div>
                                              {item.rejection_reason && (
                                                <p className="text-3xs text-zinc-400 font-sans italic pl-4">
                                                  &ldquo;{item.rejection_reason}&rdquo;
                                                </p>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-3xs uppercase bg-chrome-950 border border-chrome-750 px-1 py-0.5 text-zinc-400">
                                              Fulfilled
                                            </span>
                                          )}
                                        </td>

                                        <td className="p-2 text-right font-mono font-bold text-zinc-100 text-2xs tabular-nums">
                                          {isReturned ? (
                                            <span className="text-zinc-500 line-through">$0.00</span>
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

                            {/* Settlement Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-2xs">
                              <div className="p-2 bg-chrome-950 border border-chrome-800">
                                <span className="text-3xs text-zinc-500 block uppercase">Gross Order</span>
                                <span className="font-mono text-zinc-200 font-bold tabular-nums">
                                  ${Number(ord.original_total || ord.total).toFixed(2)}
                                </span>
                              </div>
                              <div className="p-2 bg-chrome-950 border border-chrome-800">
                                <span className="text-3xs text-zinc-500 block uppercase">Tax (8.5%)</span>
                                <span className="font-mono text-zinc-200 font-bold tabular-nums">
                                  ${Number(ord.tax_amount || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="p-2 bg-chrome-950 border border-chrome-800">
                                <span className="text-3xs text-zinc-500 block uppercase">Logistics Fee</span>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {Number(ord.shipping_fee) > 0 ? `$${Number(ord.shipping_fee).toFixed(2)}` : 'Complimentary'}
                                </span>
                              </div>
                              <div className="p-2 bg-cyan-950/20 border border-cyan-900/40">
                                <span className="text-3xs text-cyan-300 block uppercase font-bold">Net Total</span>
                                <span className="font-mono text-cyan-200 font-bold text-xs tabular-nums">
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

            {filteredOrders.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-xs text-zinc-500">
                  No orders match the selected channel filter or search query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
