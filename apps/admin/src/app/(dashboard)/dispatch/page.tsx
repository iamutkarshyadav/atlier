'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  MapPin,
  Barcode as BarcodeIcon,
  Box,
  Layers,
  Printer,
  RotateCcw,
  Check,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Tag,
  Scan,
} from 'lucide-react'
import { Button, Barcode } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getAllOrders,
  getLocations,
  getLocationShelves,
  allocateAndPickOnlineOrder,
  processBorisReturn,
  updateOrderStatus,
  type OrderWithItems,
  type StoreLocation,
  type Shelf,
  type QcStatus,
} from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocation } from '@/context/LocationContext'
import { ShippingLabelModal, type ShippingLabelData } from '@/components/ui/PrintTemplates'

interface PickTask {
  id: string
  orderId: string
  orderNumber: string
  orderItemId: string
  productTitle: string
  size: string
  sku: string
  quantity: number
  shelfId: string
  shelfCoordinate: string
  toteId: string
  isPicked: boolean
}

interface ReturnedItemRow {
  orderId: string
  orderNumber: string
  orderItemId: string
  customerName: string
  customerAddress: string
  productTitle: string
  size: string
  sku: string
  unitPrice: number
  rejectionReason: string
  qcCondition: QcStatus
  targetShelfId: string
  refundMode: 'store_credit' | 'original_payment'
  isRestocked: boolean
  restockedShelfCoordinate?: string
}

export default function OutboundDispatchPage() {
  const { activeLocationCode, activeLocationId, locations } = useLocation()
  const [activeTab, setActiveTab] = useState<'pick_waves' | 'packing_station' | 'tryon_returns'>('pick_waves')
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hardware Scanner / Pick Wave State
  const [currentToteId, setCurrentToteId] = useState('TOTE-042')
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [pickTasks, setPickTasks] = useState<PickTask[]>([])
  const [pickFilter, setPickFilter] = useState<'all' | 'pending' | 'picked'>('all')

  // Packing Station State
  const [selectedPackingOrderId, setSelectedPackingOrderId] = useState<string | null>(null)
  const [packageWeightKg, setPackageWeightKg] = useState('1.25')
  const [packageDimensions, setPackageDimensions] = useState('32 x 24 x 10 cm')
  const [carrierName, setCarrierName] = useState('Bluedart Express')
  const [awbCode, setAwbCode] = useState('BD-88239012')
  const [isShippingLabelOpen, setIsShippingLabelOpen] = useState(false)
  const [shippingLabelData, setShippingLabelData] = useState<ShippingLabelData | null>(null)

  // Bolt Try-On Returns Restock State
  const [returnedItems, setReturnedItems] = useState<ReturnedItemRow[]>([])
  const [processingReturnItemId, setProcessingReturnItemId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Initial Data Fetching
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      let fetchedOrders: OrderWithItems[] = []
      try {
        const res = await fetch('/api/orders')
        const data = await res.json()
        if (data.success && Array.isArray(data.orders)) {
          fetchedOrders = data.orders
        }
      } catch {}

      const supabase = createBrowserClient()
      const [allOrders, fetchedLocations] = await Promise.all([
        fetchedOrders.length > 0 ? Promise.resolve(fetchedOrders) : getAllOrders(supabase),
        getLocations(supabase),
      ])

      setOrders(allOrders)

      // Find current location UUID
      const matchedLoc =
        fetchedLocations.find((l) => l.code === activeLocationCode) ||
        fetchedLocations[0] || { id: activeLocationId || 'l1000000-0000-0000-0000-000000000001' }

      const fetchedShelves = await getLocationShelves(supabase, matchedLoc.id)
      setShelves(fetchedShelves)

      // 1. Build Pick Tasks from Pending / Processing Orders
      const tasks: PickTask[] = []
      const defaultShelf = fetchedShelves[0] || {
        id: 'sh-blr-01',
        coordinate: 'BLK-A-01-A1',
      }

      const activeOrders = fetchedOrders.filter(
        (o) => o.status === 'pending' || o.status === 'processing'
      )

      activeOrders.forEach((ord, ordIdx) => {
        const items = ord.order_items || []
        items.forEach((item, itemIdx) => {
          // Assign shelf sequentially or fallback to first shelves
          const assignedShelf =
            fetchedShelves[(ordIdx + itemIdx) % Math.max(1, fetchedShelves.length)] || defaultShelf

          tasks.push({
            id: `task-${ord.id}-${item.id}`,
            orderId: ord.id,
            orderNumber: ord.order_number || `ORD-${ord.id.slice(0, 8).toUpperCase()}`,
            orderItemId: item.id,
            productTitle: item.product?.title || 'Luxury Garment',
            size: item.size || 'M',
            sku: `SKU-${(item.product?.title || 'GAR').slice(0, 4).toUpperCase()}-${item.size || 'M'}`,
            quantity: item.quantity || 1,
            shelfId: assignedShelf.id,
            shelfCoordinate: assignedShelf.coordinate,
            toteId: currentToteId,
            isPicked: ord.status === 'processing' && itemIdx === 0, // Mock sample picked item
          })
        })
      })

      // Sort pick tasks strictly by physical shelf coordinate for sequential warehouse traversal!
      tasks.sort((a, b) => a.shelfCoordinate.localeCompare(b.shelfCoordinate))
      setPickTasks(tasks)

      // 2. Build Bolt 45m Try-On Returned Items
      const retRows: ReturnedItemRow[] = []
      fetchedOrders
        .filter((o) => o.delivery_mode === 'try_on')
        .forEach((ord) => {
          const items = ord.order_items || []
          items.forEach((item) => {
            if (item.is_kept === false || item.try_on_decision === 'rejected') {
              retRows.push({
                orderId: ord.id,
                orderNumber: ord.order_number || `ATL-ORD-${ord.id.slice(0, 6).toUpperCase()}`,
                orderItemId: item.id,
                customerName: ord.shipping_address?.split(',')[0] || 'Patron indiranagar',
                customerAddress: ord.shipping_address || 'Bengaluru Salon',
                productTitle: item.product?.title || 'Tailored Work',
                size: item.size || 'M',
                sku: `SKU-${(item.product?.title || 'GAR').slice(0, 4).toUpperCase()}-${item.size || 'M'}`,
                unitPrice: Number(item.unit_price || 0),
                rejectionReason:
                  item.rejection_reason || 'Doorstep fitting preference: requested size exchange',
                qcCondition: 'accepted',
                targetShelfId: fetchedShelves[0]?.id || 'sh-blr-01',
                refundMode: 'original_payment',
                isRestocked: false,
              })
            }
          })
        })

      setReturnedItems(retRows)
    } finally {
      setIsLoading(false)
    }
  }, [activeLocationCode, activeLocationId, currentToteId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pick Wave: Confirm Pick of a single item
  const handleConfirmPick = async (task: PickTask) => {
    const supabase = createBrowserClient()
    const { success, error } = await allocateAndPickOnlineOrder(supabase, {
      orderId: task.orderId,
      action: 'confirm_pick',
      locationId: activeLocationId,
      picks: [{ order_item_id: task.orderItemId, shelf_id: task.shelfId }],
      operatorId: 'OP-DISPATCH-01',
    })

    if (!success) {
      showToast(`Pick Error: ${error || 'Failed to update shelf'}`)
      return
    }

    setPickTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isPicked: true, toteId: currentToteId } : t))
    )

    showToast(`Item picked: ${task.sku} from ${task.shelfCoordinate} into ${currentToteId}`)
  }

  // Barcode Wedge Scanner Listener
  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scannedBarcode.trim()) return

    const raw = scannedBarcode.trim().toUpperCase()
    // Look for matching task by shelf coordinate, SKU, or task ID
    const match = pickTasks.find(
      (t) =>
        !t.isPicked &&
        (t.shelfCoordinate.toUpperCase() === raw ||
          `LOC-${t.shelfCoordinate}`.toUpperCase() === raw ||
          t.sku.toUpperCase() === raw ||
          t.orderNumber.toUpperCase() === raw)
    )

    if (match) {
      handleConfirmPick(match)
      setScannedBarcode('')
    } else {
      showToast(`No pending pick found matching scan: ${raw}`)
    }
  }

  // Selected Order for Packing Station
  const activePackingOrder = useMemo(() => {
    if (!selectedPackingOrderId) {
      return orders.find((o) => o.status === 'processing') || orders[0] || null
    }
    return orders.find((o) => o.id === selectedPackingOrderId) || null
  }, [orders, selectedPackingOrderId])

  // Packing: Open Thermal 4x6 Label Modal
  const handleOpenShippingLabel = () => {
    if (!activePackingOrder) return

    const labelData: ShippingLabelData = {
      orderNumber: activePackingOrder.order_number || `ORD-${activePackingOrder.id.slice(0, 8).toUpperCase()}`,
      awbNumber: awbCode,
      carrierName: carrierName,
      deliveryMode: activePackingOrder.delivery_mode === 'try_on' ? '45M TRY-ON EXPRESS' : 'STANDARD DELIVERY',
      originHub: `${activeLocationCode} FULFILLMENT HUB`,
      recipientName: activePackingOrder.shipping_address?.split(',')[0] || 'Valued Patron',
      recipientPhone: '+91 98450 12890',
      addressLine1: activePackingOrder.shipping_address || 'Bengaluru Atelier Address',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: activePackingOrder.bolt_pincode || '560038',
      weightKg: parseFloat(packageWeightKg) || 1.25,
      itemCount: activePackingOrder.order_items?.length || 1,
    }

    setShippingLabelData(labelData)
    setIsShippingLabelOpen(true)
  }

  // Packing: Complete Packing & Seal Box
  const handleCompletePacking = async () => {
    if (!activePackingOrder) return
    const supabase = createBrowserClient()

    const { success, error } = await updateOrderStatus(supabase, activePackingOrder.id, 'out_for_delivery')
    if (!success) {
      showToast(`Error packing order: ${error}`)
      return
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === activePackingOrder.id ? { ...o, status: 'out_for_delivery' } : o))
    )

    showToast(`Order ${activePackingOrder.order_number} marked packed with AWB ${awbCode} and ready for carrier handoff!`)
  }

  // Bolt Try-On: Restock Rejected Garment Back to Shelf
  const handleRestockBoris = async (item: ReturnedItemRow) => {
    setProcessingReturnItemId(item.orderItemId)
    try {
      const supabase = createBrowserClient()
      const { success, restockedShelfId, error } = await processBorisReturn(supabase, {
        orderId: item.orderId,
        orderItemId: item.orderItemId,
        locationId: activeLocationId || 'l1000000-0000-0000-0000-000000000001',
        targetShelfId: item.targetShelfId,
        condition: item.qcCondition,
        refundMode: item.refundMode,
        operatorId: 'OP-DISPATCH-01',
        notes: `Returned from 45m Try-On: ${item.rejectionReason}`,
      })

      if (!success) {
        showToast(`Restock Error: ${error || 'Failed to return stock to shelf'}`)
        return
      }

      const shelfCoord =
        shelves.find((s) => s.id === item.targetShelfId)?.coordinate || 'BLK-A-01-A1'

      setReturnedItems((prev) =>
        prev.map((r) =>
          r.orderItemId === item.orderItemId
            ? { ...r, isRestocked: true, restockedShelfCoordinate: shelfCoord }
            : r
        )
      )

      showToast(`Successfully restocked ${item.sku} onto shelf ${shelfCoord}! Ledger entry generated.`)
    } finally {
      setProcessingReturnItemId(null)
    }
  }

  // Filtered pick tasks
  const filteredPickTasks = useMemo(() => {
    if (pickFilter === 'pending') return pickTasks.filter((t) => !t.isPicked)
    if (pickFilter === 'picked') return pickTasks.filter((t) => t.isPicked)
    return pickTasks
  }, [pickTasks, pickFilter])

  const pickedCount = pickTasks.filter((t) => t.isPicked).length
  const totalCount = pickTasks.length
  const pickPercentage = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>Outbound Pick-Pack-Ship & Online WMS Hub</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Fulfill online & endless aisle orders from shelf coordinates ({activeLocationCode}) into carrier totes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh WMS
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-2.5 bg-chrome-850 border border-cyan-500/60 text-cyan-300 text-xs flex justify-between items-center shadow-lg">
          <span className="font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* 3 Operational Sub-Tabs */}
      <div className="flex border-b border-chrome-800 bg-chrome-950">
        <button
          onClick={() => setActiveTab('pick_waves')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'pick_waves'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>1. Allocation & Pick Waves ({pickedCount}/{totalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('packing_station')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'packing_station'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>2. Packing & Box Verification</span>
        </button>

        <button
          onClick={() => setActiveTab('tryon_returns')}
          className={`flex items-center gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'tryon_returns'
              ? 'border-cyan-400 text-cyan-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>3. Bolt 45m Try-On Restock ({returnedItems.filter((r) => !r.isRestocked).length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ALLOCATION & PICK WAVES */}
      {/* ========================================================= */}
      {activeTab === 'pick_waves' && (
        <div className="space-y-4">
          {/* Pick Wave Controls & Barcode Wedge Listener */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-chrome-900 border border-chrome-800 items-center">
            {/* Active Tote Input */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-2xs text-zinc-400 uppercase font-semibold">Carrier Tote:</span>
              <input
                type="text"
                value={currentToteId}
                onChange={(e) => setCurrentToteId(e.target.value.toUpperCase())}
                className="bg-chrome-950 border border-chrome-700 px-2 py-1 text-xs text-cyan-300 font-bold w-28 uppercase focus:outline-none"
              />
            </div>

            {/* Hardware Barcode Wedge Input */}
            <form onSubmit={handleBarcodeScanSubmit} className="md:col-span-6 flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                placeholder="Scan Shelf Barcode (LOC-BLK-A-01) or SKU to Confirm Pick..."
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                className="w-full bg-chrome-950 border border-chrome-700 px-3 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <Button type="submit" variant="terminal" size="sm" className="h-7 text-3xs shrink-0">
                Match Pick
              </Button>
            </form>

            {/* Filter Pills & Progress */}
            <div className="md:col-span-3 flex items-center justify-end gap-2 text-2xs">
              <span className="text-zinc-400">Progress:</span>
              <span className="font-bold text-cyan-300 tabular-nums">{pickPercentage}%</span>
              <div className="w-20 bg-chrome-950 h-2 border border-chrome-750 overflow-hidden">
                <div className="bg-cyan-400 h-full transition-all" style={{ width: `${pickPercentage}%` }} />
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 text-2xs">
            <button
              onClick={() => setPickFilter('all')}
              className={`px-2.5 py-1 border ${
                pickFilter === 'all'
                  ? 'bg-chrome-800 text-zinc-100 border-chrome-600'
                  : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
              }`}
            >
              All Items ({totalCount})
            </button>
            <button
              onClick={() => setPickFilter('pending')}
              className={`px-2.5 py-1 border ${
                pickFilter === 'pending'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                  : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
              }`}
            >
              Pending Pick ({totalCount - pickedCount})
            </button>
            <button
              onClick={() => setPickFilter('picked')}
              className={`px-2.5 py-1 border ${
                pickFilter === 'picked'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                  : 'bg-chrome-950 text-zinc-400 border-chrome-800 hover:text-zinc-200'
              }`}
            >
              Picked into Tote ({pickedCount})
            </button>
          </div>

          {/* Pick Tasks Grid (Sorted by Shelf Coordinate) */}
          <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
                  <th className="py-2 px-3 font-semibold text-cyan-400">Shelf Coordinate</th>
                  <th className="py-2 px-3 font-semibold">Garment Piece</th>
                  <th className="py-2 px-3 font-semibold">Size & SKU</th>
                  <th className="py-2 px-3 font-semibold">Order Ref</th>
                  <th className="py-2 px-3 font-semibold text-center">Tote</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold text-right">Pick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chrome-800">
                {filteredPickTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-chrome-850 transition-colors ${
                      task.isPicked ? 'bg-chrome-950/60 opacity-75' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-bold text-cyan-300 text-xs tabular-nums">
                          {task.shelfCoordinate}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-zinc-200">
                      {task.productTitle}
                    </td>

                    <td className="py-2.5 px-3 text-2xs">
                      <span className="text-amber-300 font-bold">{task.size}</span>
                      <span className="text-zinc-500 ml-1.5 tabular-nums">({task.sku})</span>
                    </td>

                    <td className="py-2.5 px-3 text-2xs text-zinc-400 font-mono">
                      {task.orderNumber}
                    </td>

                    <td className="py-2.5 px-3 text-center text-2xs">
                      <span className="px-1.5 py-0.5 bg-chrome-800 border border-chrome-700 text-zinc-300 uppercase font-semibold">
                        {task.toteId}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-2xs">
                      {task.isPicked ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Picked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-900/60 px-1.5 py-0.5">
                          <Clock className="w-3 h-3" /> Awaiting Pick
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {task.isPicked ? (
                        <span className="text-3xs text-zinc-500 uppercase">In Tote</span>
                      ) : (
                        <Button
                          variant="terminal"
                          size="sm"
                          onClick={() => handleConfirmPick(task)}
                          className="h-6 px-2.5 text-3xs border-cyan-500/60 text-cyan-300 hover:bg-cyan-950/40"
                        >
                          Confirm Pick
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredPickTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                      No pick tasks match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PACKING STATION & BOX VERIFICATION */}
      {/* ========================================================= */}
      {activeTab === 'packing_station' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Order Selection */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-2xs font-bold uppercase tracking-wider text-zinc-400">
              Orders Ready for Packing ({orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length})
            </h2>

            <div className="bg-chrome-900 border border-chrome-800 divide-y divide-chrome-800 max-h-[560px] overflow-y-auto">
              {orders
                .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
                .map((ord) => {
                  const isSelected = (activePackingOrder?.id === ord.id)
                  const itemsCount = ord.order_items?.length || 0

                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedPackingOrderId(ord.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/30 border-l-2 border-cyan-400'
                          : 'hover:bg-chrome-850'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-100 tabular-nums">
                          {ord.order_number || `ORD-${ord.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <StatusBadge variant={ord.status} dot />
                      </div>
                      <div className="flex justify-between items-center text-2xs text-zinc-400 mt-1">
                        <span>{itemsCount} Garment Piece{itemsCount > 1 ? 's' : ''}</span>
                        <span className="uppercase text-zinc-300">
                          {ord.delivery_mode === 'try_on' ? '45m Try-On' : 'Standard'}
                        </span>
                      </div>
                      <p className="text-3xs text-zinc-500 truncate mt-1">
                        {ord.shipping_address || 'Studio Indiranagar, Bengaluru'}
                      </p>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Right Column: Packing Workbench */}
          <div className="lg:col-span-7 bg-chrome-900 border border-chrome-800 p-4 space-y-4">
            {activePackingOrder ? (
              <>
                <div className="flex justify-between items-center border-b border-chrome-800 pb-3">
                  <div>
                    <span className="text-3xs uppercase tracking-wider text-cyan-400 font-bold block">
                      Packing Workbench
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100">
                      {activePackingOrder.order_number || `ORD-${activePackingOrder.id.slice(0, 8).toUpperCase()}`}
                    </h3>
                  </div>
                  <div className="text-right text-2xs">
                    <span className="text-zinc-500 block">DESTINATION PIN:</span>
                    <strong className="text-zinc-200 font-mono font-bold">
                      {activePackingOrder.bolt_pincode || '560038'}
                    </strong>
                  </div>
                </div>

                {/* Garments in this box */}
                <div className="space-y-1.5">
                  <span className="text-3xs uppercase text-zinc-400 font-semibold block">
                    Verified Items in Box:
                  </span>
                  <div className="border border-chrome-800 bg-chrome-950 p-2 space-y-1 text-2xs">
                    {(activePackingOrder.order_items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 border-b border-chrome-850 last:border-0">
                        <span className="font-semibold text-zinc-200">
                          {it.product?.title || 'Luxury Garment'} (Size {it.size || 'M'})
                        </span>
                        <span className="text-zinc-400 tabular-nums">Qty: {it.quantity || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Packing Specs Form */}
                <div className="grid grid-cols-2 gap-3 text-2xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold block">Box Weight (KG) *</label>
                    <input
                      type="text"
                      value={packageWeightKg}
                      onChange={(e) => setPackageWeightKg(e.target.value)}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-400 tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold block">Box Dimensions (L x W x H) *</label>
                    <input
                      type="text"
                      value={packageDimensions}
                      onChange={(e) => setPackageDimensions(e.target.value)}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-400 tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold block">Logistics Carrier *</label>
                    <select
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Bluedart Express">Bluedart Express (Air Cargo)</option>
                      <option value="Delhivery Surface">Delhivery Surface Express</option>
                      <option value="Shadowfax Hyperlocal">Shadowfax Hyperlocal (City)</option>
                      <option value="Dunzo 45m Quick-Commerce">Dunzo 45m Quick-Commerce</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold block">AWB Tracking Code *</label>
                    <input
                      type="text"
                      value={awbCode}
                      onChange={(e) => setAwbCode(e.target.value.toUpperCase())}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Print Triggers */}
                <div className="p-3 bg-chrome-950 border border-chrome-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-2xs font-bold text-zinc-200 block">Print Dispatch Collateral:</span>
                    <span className="text-3xs text-zinc-500">4x6&quot; Thermal Shipping Label & Official GST Tax Invoice</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="terminal"
                      size="sm"
                      onClick={handleOpenShippingLabel}
                      className="h-7 px-3 text-2xs flex items-center gap-1.5 border-cyan-500/60 text-cyan-300"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print 4x6&quot; Label
                    </Button>

                    <Link
                      href={`/invoice/${activePackingOrder.id}?print=true`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-chrome-800 hover:bg-chrome-750 text-zinc-200 border border-chrome-700 text-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> A4 Tax Invoice
                    </Link>
                  </div>
                </div>

                {/* Final Packing Action */}
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCompletePacking}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5 px-4"
                  >
                    <ShieldCheck className="w-4 h-4" /> Seal Box & Mark Out for Delivery
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-xs text-zinc-500">
                Select an order from the list on the left to begin packing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BOLT 45M TRY-ON RETURN RESTOCK */}
      {/* ========================================================= */}
      {activeTab === 'tryon_returns' && (
        <div className="space-y-4">
          <div className="p-3 bg-chrome-900 border border-chrome-800 flex justify-between items-center text-2xs">
            <div className="space-y-0.5">
              <span className="text-zinc-200 font-bold block">45-Minute Doorstep Try-On Rejections</span>
              <span className="text-zinc-400">
                Garments tried at patron doorstep and returned. Inspect QC condition and restock back to warehouse shelf.
              </span>
            </div>
            <span className="px-2 py-0.5 bg-chrome-800 border border-chrome-700 text-zinc-300 uppercase font-bold">
              {returnedItems.filter((r) => !r.isRestocked).length} Awaiting Shelf Putaway
            </span>
          </div>

          <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
                  <th className="py-2.5 px-3 font-semibold">Order & Patron</th>
                  <th className="py-2.5 px-3 font-semibold">Returned Garment</th>
                  <th className="py-2.5 px-3 font-semibold">Doorstep Rejection Reason</th>
                  <th className="py-2.5 px-3 font-semibold">QC Inspection</th>
                  <th className="py-2.5 px-3 font-semibold">Target Putaway Shelf</th>
                  <th className="py-2.5 px-3 font-semibold">Refund Mode</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Restock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chrome-800">
                {returnedItems.map((item) => (
                  <tr
                    key={item.orderItemId}
                    className={`hover:bg-chrome-850 transition-colors ${
                      item.isRestocked ? 'bg-chrome-950/60 opacity-75' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-2xs">
                      <span className="font-bold text-zinc-100 block font-mono">{item.orderNumber}</span>
                      <span className="text-zinc-400">{item.customerName}</span>
                    </td>

                    <td className="py-2.5 px-3 text-2xs">
                      <span className="font-semibold text-zinc-200 block">{item.productTitle}</span>
                      <span className="text-amber-300 font-bold">Size {item.size}</span>
                      <span className="text-zinc-500 ml-1">({item.sku})</span>
                    </td>

                    <td className="py-2.5 px-3 text-2xs text-zinc-400 italic max-w-xs">
                      &ldquo;{item.rejectionReason}&rdquo;
                    </td>

                    <td className="py-2.5 px-3">
                      {item.isRestocked ? (
                        <span className="text-2xs text-zinc-400 uppercase font-semibold">
                          Condition: {item.qcCondition}
                        </span>
                      ) : (
                        <select
                          value={item.qcCondition}
                          onChange={(e) => {
                            const val = e.target.value as QcStatus
                            setReturnedItems((prev) =>
                              prev.map((r) =>
                                r.orderItemId === item.orderItemId ? { ...r, qcCondition: val } : r
                              )
                            )
                          }}
                          className="bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-200 focus:outline-none"
                        >
                          <option value="accepted">Accepted (Grade A - Fold & Sell)</option>
                          <option value="rejected_damaged">Damaged (Seam/Stitch Repair)</option>
                          <option value="pending_qc">Quarantine (Dry Clean)</option>
                        </select>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {item.isRestocked ? (
                        <span className="text-2xs font-bold text-emerald-400 tabular-nums">
                          {item.restockedShelfCoordinate}
                        </span>
                      ) : (
                        <select
                          value={item.targetShelfId}
                          onChange={(e) => {
                            const val = e.target.value
                            setReturnedItems((prev) =>
                              prev.map((r) =>
                                r.orderItemId === item.orderItemId ? { ...r, targetShelfId: val } : r
                              )
                            )
                          }}
                          className="bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-cyan-300 font-mono focus:outline-none"
                        >
                          {shelves.map((sh) => (
                            <option key={sh.id} value={sh.id}>
                              {sh.coordinate} ({sh.zone_id ? 'Zone' : 'Shelf'})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {item.isRestocked ? (
                        <span className="text-3xs uppercase text-zinc-400 font-semibold">
                          {item.refundMode}
                        </span>
                      ) : (
                        <select
                          value={item.refundMode}
                          onChange={(e) => {
                            const val = e.target.value as any
                            setReturnedItems((prev) =>
                              prev.map((r) =>
                                r.orderItemId === item.orderItemId ? { ...r, refundMode: val } : r
                              )
                            )
                          }}
                          className="bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-300 focus:outline-none"
                        >
                          <option value="original_payment">Original Payment</option>
                          <option value="store_credit">Store Credit</option>
                        </select>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {item.isRestocked ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-3xs font-bold uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Restocked
                        </span>
                      ) : (
                        <Button
                          variant="terminal"
                          size="sm"
                          onClick={() => handleRestockBoris(item)}
                          isLoading={processingReturnItemId === item.orderItemId}
                          className="h-6 px-2.5 text-3xs border-emerald-500/60 text-emerald-300 hover:bg-emerald-950/40"
                        >
                          Restock to Shelf
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}

                {returnedItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                      No returned try-on items currently awaiting shelf putaway.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable 4x6" Thermal Shipping Label Modal */}
      {shippingLabelData && (
        <ShippingLabelModal
          isOpen={isShippingLabelOpen}
          onClose={() => setIsShippingLabelOpen(false)}
          data={shippingLabelData}
        />
      )}
    </div>
  )
}
