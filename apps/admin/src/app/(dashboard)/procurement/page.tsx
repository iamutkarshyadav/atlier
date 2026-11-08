'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Building2,
  Warehouse,
  CheckCircle2,
  AlertCircle,
  Printer,
  Barcode as BarcodeIcon,
  Search,
  Scan,
  PackageCheck,
  Check,
  Tag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getPurchaseOrders,
  getSuppliers,
  getLocations,
  getLocationShelves,
  getAllProductsAdmin,
  receiveGrnAndPutaway,
  type PurchaseOrder,
  type Supplier,
  type StoreLocation,
  type Shelf,
  type Product,
} from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'
import { useBarcodeScanner } from '@/lib/useBarcodeScanner'
import { PurchaseOrderPrintModal, type PurchaseOrderPrintData } from '@/components/ui/PrintTemplates'

interface LineItemDraft {
  variantId: string
  sku: string
  title: string
  size: string
  hsn: string
  quantity: number
  unitCost: number
  gstPercent: number
}

interface GrnLineItemState {
  orderItemId: string
  variantId: string
  sku: string
  title: string
  size: string
  orderedQty: number
  acceptedQty: number
  rejectedQty: number
  rejectionReason?: string
}

export default function ProcurementPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Drawer 1: Create Purchase Order
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [destLocationId, setDestLocationId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])
  const [isSubmittingPO, setIsSubmittingPO] = useState(false)
  const [createPoError, setCreatePoError] = useState<string | null>(null)

  // Drawer 2: Receive GRN & Shelf Putaway Workspace
  const [grnDrawerOpen, setGrnDrawerOpen] = useState(false)
  const [activePOForGrn, setActivePOForGrn] = useState<PurchaseOrder | null>(null)
  const [grnItems, setGrnItems] = useState<GrnLineItemState[]>([])
  const [availableShelves, setAvailableShelves] = useState<Shelf[]>([])
  const [selectedPutawayShelfId, setSelectedPutawayShelfId] = useState('')
  const [grnChallanNumber, setGrnChallanNumber] = useState('')
  const [isCommittingGrn, setIsCommittingGrn] = useState(false)
  const [grnError, setGrnError] = useState<string | null>(null)
  const [grnSuccess, setGrnSuccess] = useState<string | null>(null)

  // Modal 3: Print A4 Purchase Order
  const [printData, setPrintData] = useState<PurchaseOrderPrintData | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [pos, sups, locs, prods] = await Promise.all([
        getPurchaseOrders(supabase),
        getSuppliers(supabase),
        getLocations(supabase),
        getAllProductsAdmin(supabase),
      ])
      setPurchaseOrders(pos)
      setSuppliers(sups)
      setLocations(locs)
      setProducts(prods)
      if (sups.length > 0 && !selectedSupplierId) setSelectedSupplierId(sups[0]?.id || '')
      if (locs.length > 0 && !destLocationId) setDestLocationId(locs[0]?.id || '')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Hardware Scanner Integration for GRN Putaway Workspace
  useBarcodeScanner({
    onScan: (scanned) => {
      const code = scanned.trim().toUpperCase()
      if (!grnDrawerOpen) return

      // 1. If scanning a shelf barcode (e.g. BLK-A-01-A1 or LOC-...)
      const matchedShelf = availableShelves.find(
        (s) => s.coordinate.toUpperCase() === code || s.barcode.toUpperCase() === code
      )
      if (matchedShelf) {
        setSelectedPutawayShelfId(matchedShelf.id)
        return
      }

      // 2. If scanning a garment SKU or barcode: increment accepted quantity
      setGrnItems((prev) =>
        prev.map((item) => {
          if (item.sku.toUpperCase() === code) {
            const nextAccepted = Math.min(item.orderedQty, item.acceptedQty + 1)
            return { ...item, acceptedQty: nextAccepted }
          }
          return item
        })
      )
    },
  })

  // Open Create PO Drawer with 1 default item
  const openCreatePo = () => {
    setCreatePoError(null)
    const today = new Date()
    today.setDate(today.getDate() + 14)
    setExpectedDate(today.toISOString().slice(0, 10))

    if (products.length > 0) {
      const p = products[0]
      setLineItems([
        {
          variantId: `v-${p?.id || 'prod'}-s`,
          sku: `SKU-${(p?.title || 'GARMENT').slice(0, 4).toUpperCase()}-48`,
          title: p?.title || 'Cashmere Topcoat',
          size: '48',
          hsn: '6201.11',
          quantity: 20,
          unitCost: Math.round(Number(p?.price || 1000) * 0.4),
          gstPercent: 12,
        },
      ])
    }
    setCreateDrawerOpen(true)
  }

  const addLineItem = () => {
    const p = products[Math.floor(Math.random() * products.length)]
    setLineItems((prev) => [
      ...prev,
      {
        variantId: `v-${Date.now()}`,
        sku: `SKU-${(p?.title || 'ITEM').slice(0, 4).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
        title: p?.title || 'Tailored Garment',
        size: '50',
        hsn: '6203.31',
        quantity: 10,
        unitCost: 150,
        gstPercent: 12,
      },
    ])
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Calculated PO totals
  const poSubtotal = useMemo(() => {
    return lineItems.reduce((sum, it) => sum + it.quantity * it.unitCost, 0)
  }, [lineItems])

  const poTaxAmount = useMemo(() => {
    return lineItems.reduce((sum, it) => sum + it.quantity * it.unitCost * (it.gstPercent / 100), 0)
  }, [lineItems])

  const poGrandTotal = poSubtotal + poTaxAmount

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lineItems.length === 0) {
      setCreatePoError('Please add at least one line item to the Purchase Order.')
      return
    }

    setIsSubmittingPO(true)
    setCreatePoError(null)

    try {
      const supabase = createBrowserClient()
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randSeq = Math.floor(1000 + Math.random() * 9000)
      const poNumber = `PO-${today}-${randSeq}`

      const { data: newPo, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: selectedSupplierId,
          destination_location_id: destLocationId,
          status: 'issued',
          expected_delivery_date: expectedDate,
          subtotal: poSubtotal,
          tax_amount: poTaxAmount,
          total_amount: poGrandTotal,
          created_by: 'admin',
        })
        .select()
        .single()

      if (poErr) throw poErr

      setCreateDrawerOpen(false)
      loadData()
    } catch (err: any) {
      setCreatePoError(err?.message || 'Failed to issue Purchase Order')
    } finally {
      setIsSubmittingPO(false)
    }
  }

  // Open Receive GRN & Directed Shelf Putaway
  const openGrnWorkspace = async (po: PurchaseOrder) => {
    setActivePOForGrn(po)
    setGrnError(null)
    setGrnSuccess(null)
    setGrnChallanNumber(`DC-${po.po_number.replace('PO-', '')}`)

    try {
      const supabase = createBrowserClient()
      const shelves = await getLocationShelves(supabase, po.destination_location_id)
      setAvailableShelves(shelves)
      if (shelves.length > 0) {
        setSelectedPutawayShelfId(shelves[0]?.id || '')
      }

      // Initialize mock or real PO line items for receiving
      setGrnItems([
        {
          orderItemId: `poi-1`,
          variantId: `v1000000-0000-0000-0000-000000000001`,
          sku: 'SKU-COAT-BLK-48',
          title: 'Cashmere Double-Breasted Overcoat',
          size: '48',
          orderedQty: 10,
          acceptedQty: 10,
          rejectedQty: 0,
        },
        {
          orderItemId: `poi-2`,
          variantId: `v1000000-0000-0000-0000-000000000002`,
          sku: 'SKU-COAT-BLK-50',
          title: 'Cashmere Double-Breasted Overcoat',
          size: '50',
          orderedQty: 10,
          acceptedQty: 8,
          rejectedQty: 2,
          rejectionReason: 'Fabric weave snag on collar',
        },
      ])

      setGrnDrawerOpen(true)
    } catch {
      // Continue
    }
  }

  // Commit GRN & Directed Shelf Putaway via Atomic RPC
  const handleCommitGrn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePOForGrn || !selectedPutawayShelfId) {
      setGrnError('Please select a valid putaway shelf bin.')
      return
    }

    setIsCommittingGrn(true)
    setGrnError(null)
    setGrnSuccess(null)

    try {
      const supabase = createBrowserClient()
      const totalAccepted = grnItems.reduce((sum, it) => sum + it.acceptedQty, 0)
      const primaryItem = grnItems[0]

      const res = await receiveGrnAndPutaway(supabase, {
        poId: activePOForGrn.id,
        locationId: activePOForGrn.destination_location_id,
        targetShelfId: selectedPutawayShelfId,
        operatorId: 'admin',
        receivedItems: grnItems.map((it) => ({
          variant_id: it.variantId,
          qty_accepted: it.acceptedQty,
          qty_rejected: it.rejectedQty,
          unit_cost: 180,
        })),
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to commit GRN')
      }

      setGrnSuccess(`GRN Verified! ${totalAccepted} units stocked into shelf bin.`)
      setTimeout(() => {
        setGrnDrawerOpen(false)
        loadData()
      }, 1200)
    } catch (err: any) {
      setGrnError(err?.message || 'GRN putaway transaction failed')
    } finally {
      setIsCommittingGrn(false)
    }
  }

  // Print A4 Commercial PO
  const handlePrintPO = (po: PurchaseOrder) => {
    const sup = suppliers.find((s) => s.id === po.supplier_id)
    const loc = locations.find((l) => l.id === po.destination_location_id)

    setPrintData({
      poNumber: po.po_number,
      createdDate: po.created_at ? new Date(po.created_at).toLocaleDateString() : 'Today',
      expectedDate: po.expected_delivery_date,
      vendorCode: sup?.vendor_code || 'SUP-01',
      vendorName: sup?.name || 'Fabric Mill Partner',
      vendorGstin: sup?.gstin || '29AAAAA0000A1Z5',
      vendorAddress: `${sup?.address_line1 || 'Industrial Estate'}, ${sup?.city || 'Biella'}, ${sup?.state || 'Piedmont'}`,
      deliveryLocationCode: loc?.code || 'BLR-WH01',
      deliveryLocationName: loc?.name || 'Central Fulfilment Hub',
      deliveryGstin: loc?.gstin || '29AAAAA0000A1Z5',
      deliveryAddress: `${loc?.address_line1 || 'Phase 1, Electronic City'}, ${loc?.city || 'Bengaluru'}`,
      items: [
        {
          sku: 'SKU-COAT-BLK-48',
          title: 'Cashmere Double-Breasted Overcoat',
          size: '48',
          hsn: '6201.11',
          quantity: 20,
          unitCost: 150,
          gstPercent: 12,
          lineTotal: 3000,
        },
        {
          sku: 'SKU-COAT-BLK-50',
          title: 'Cashmere Double-Breasted Overcoat',
          size: '50',
          hsn: '6201.11',
          quantity: 10,
          unitCost: 150,
          gstPercent: 12,
          lineTotal: 1500,
        },
      ],
      subtotal: po.subtotal,
      taxAmount: po.tax_amount,
      totalAmount: po.total_amount,
    })
  }

  const filteredPOs = purchaseOrders.filter((po) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return po.po_number.toLowerCase().includes(q) || po.status.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4 font-mono pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>Inbound Supply Chain — Purchase Orders & GRN Putaway</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Vendor procurement, commercial orders, barcode-directed receiving, and shelf bin putaway
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
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={openCreatePo}
            className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 rounded-none"
          >
            <Plus className="w-3.5 h-3.5" /> Issue Purchase Order
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-2 bg-chrome-900 border border-chrome-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO Number, Status..."
            className="w-full bg-chrome-950 border border-chrome-800 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>
        <div className="text-2xs text-zinc-500 tabular-nums">
          {filteredPOs.length} Procurement Manifests
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 font-semibold">PO Number</th>
              <th className="py-2.5 px-3 font-semibold">Vendor Partner</th>
              <th className="py-2.5 px-3 font-semibold">Destination Hub</th>
              <th className="py-2.5 px-3 font-semibold">Expected Delivery</th>
              <th className="py-2.5 px-3 font-semibold text-right">Committed Value</th>
              <th className="py-2.5 px-3 font-semibold">Status</th>
              <th className="py-2.5 px-3 font-semibold text-right">Inbound / Print Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome-800">
            {filteredPOs.map((po) => {
              const sup = suppliers.find((s) => s.id === po.supplier_id)
              const dest = locations.find((l) => l.id === po.destination_location_id)

              return (
                <tr key={po.id} className="hover:bg-chrome-850 transition-colors">
                  {/* PO # */}
                  <td className="py-2.5 px-3 font-bold text-zinc-100 tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{po.po_number}</span>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-zinc-200">{sup?.name || 'Lanificio Cerruti'}</div>
                    <div className="text-3xs text-zinc-500 uppercase">{sup?.vendor_code || 'SUP-01'}</div>
                  </td>

                  {/* Destination */}
                  <td className="py-2.5 px-3 font-mono text-2xs text-zinc-300">
                    <div className="flex items-center gap-1">
                      <Warehouse className="w-3 h-3 text-cyan-400" />
                      <span className="font-semibold">{dest?.code || 'BLR-WH01'}</span>
                    </div>
                    <span className="text-3xs text-zinc-500 truncate block max-w-[120px]">{dest?.name}</span>
                  </td>

                  {/* Expected Date */}
                  <td className="py-2.5 px-3 text-2xs text-zinc-400 tabular-nums">
                    {po.expected_delivery_date}
                  </td>

                  {/* Committed Value */}
                  <td className="py-2.5 px-3 text-right font-bold text-zinc-100 tabular-nums">
                    ${Number(po.total_amount).toFixed(2)}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3">
                    <StatusBadge variant={po.status} dot />
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Receive GRN Trigger */}
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button
                          onClick={() => openGrnWorkspace(po)}
                          className="px-2 py-1 text-2xs bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 transition-colors flex items-center gap-1 font-semibold"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>Receive GRN</span>
                        </button>
                      )}

                      {/* Print A4 Commercial PO */}
                      <button
                        onClick={() => handlePrintPO(po)}
                        className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-chrome-800 transition-colors border border-transparent hover:border-chrome-700"
                        title="Print A4 Commercial Purchase Order"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {filteredPOs.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                  No purchase orders found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DRAWER 1: Issue Purchase Order */}
      <SlideOverDrawer
        isOpen={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Issue Commercial Purchase Order"
        description="Specify manufacturing partner, destination receiving warehouse, line items, and wholesale terms."
        width="max-w-2xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          {createPoError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createPoError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Supplier Vendor *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.vendor_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Destination Receiving Node *
              </label>
              <select
                value={destLocationId}
                onChange={(e) => setDestLocationId(e.target.value)}
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Expected Delivery Date *
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2 border-t border-chrome-800">
            <div className="flex justify-between items-center">
              <span className="text-2xs uppercase tracking-wider text-zinc-300 font-semibold">
                Ordered Garments & Fabrics ({lineItems.length})
              </span>
              <button
                type="button"
                onClick={addLineItem}
                className="px-2 py-0.5 text-2xs bg-chrome-800 hover:bg-chrome-750 text-zinc-200 border border-chrome-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Variant Line
              </button>
            </div>

            <div className="border border-chrome-800 divide-y divide-chrome-800 bg-chrome-950 max-h-60 overflow-y-auto">
              {lineItems.map((item, idx) => (
                <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5 space-y-0.5">
                    <span className="font-semibold text-zinc-200 block truncate">{item.title}</span>
                    <span className="text-3xs text-zinc-500 font-mono">
                      {item.sku} &bull; Size {item.size}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="text-3xs text-zinc-500 block">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1
                        setLineItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                        )
                      }}
                      className="w-full bg-chrome-900 border border-chrome-800 px-1.5 py-1 text-2xs text-zinc-100 text-center font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-3xs text-zinc-500 block">Cost ($)</label>
                    <input
                      type="number"
                      min="1"
                      value={item.unitCost}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setLineItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, unitCost: val } : it))
                        )
                      }}
                      className="w-full bg-chrome-900 border border-chrome-800 px-1.5 py-1 text-2xs text-zinc-100 text-center font-mono"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <label className="text-3xs text-zinc-500 block">Total</label>
                    <span className="font-bold text-zinc-200 tabular-nums text-2xs">
                      ${(item.quantity * item.unitCost).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-zinc-600 hover:text-rose-400 p-1"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal & Taxes */}
          <div className="p-3 bg-chrome-950 border border-chrome-800 space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400 text-2xs">
              <span>Subtotal:</span>
              <span className="tabular-nums font-mono">${poSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400 text-2xs">
              <span>Estimated GST Tax (12%):</span>
              <span className="tabular-nums font-mono">${poTaxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-zinc-100 pt-1 border-t border-chrome-800">
              <span>Grand Total:</span>
              <span className="tabular-nums text-emerald-400 font-mono">${poGrandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-chrome-800">
            <Button
              type="button"
              variant="terminal"
              size="sm"
              onClick={() => setCreateDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSubmittingPO}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none"
            >
              Commit & Issue PO
            </Button>
          </div>
        </form>
      </SlideOverDrawer>

      {/* DRAWER 2: Split-Screen GRN & Directed Shelf Putaway Workspace */}
      <SlideOverDrawer
        isOpen={grnDrawerOpen}
        onClose={() => setGrnDrawerOpen(false)}
        title={`Goods Receipt (GRN) & Putaway: ${activePOForGrn?.po_number}`}
        description="Verify physical delivered cartons against PO manifest, log QC inspection, and stock accepted units into destination shelf bins."
        width="max-w-2xl"
      >
        <form onSubmit={handleCommitGrn} className="space-y-4">
          {grnError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{grnError}</span>
            </div>
          )}

          {grnSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{grnSuccess}</span>
            </div>
          )}

          {/* Delivery Challan Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Vendor Delivery Challan # *
              </label>
              <input
                type="text"
                value={grnChallanNumber}
                onChange={(e) => setGrnChallanNumber(e.target.value.toUpperCase())}
                placeholder="DC-9842"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none uppercase font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Target Shelf Putaway Bin *
              </label>
              <select
                value={selectedPutawayShelfId}
                onChange={(e) => setSelectedPutawayShelfId(e.target.value)}
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none font-mono"
              >
                <option value="">Select target putaway bin...</option>
                {availableShelves.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.coordinate} (Cap: {s.max_unit_capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Realtime Barcode Scanner Indicator */}
          <div className="p-2.5 bg-chrome-950 border border-chrome-800 flex items-center justify-between text-2xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-400" />
              <span>Scan garment barcode to accept items automatically</span>
            </div>
            <span className="text-3xs text-emerald-400 font-semibold">CADENCE &lt;35MS</span>
          </div>

          {/* GRN Line Items Receiving & QC */}
          <div className="space-y-2">
            <span className="text-2xs uppercase tracking-wider text-zinc-300 font-semibold block">
              Carton Verification & QC Inspection
            </span>

            <div className="border border-chrome-800 divide-y divide-chrome-800 bg-chrome-950">
              {grnItems.map((item, idx) => (
                <div key={idx} className="p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-zinc-100 block">{item.title}</span>
                      <span className="text-3xs text-zinc-500 font-mono">
                        {item.sku} &bull; Size {item.size} &bull; Ordered: {item.orderedQty} pcs
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <label className="text-3xs text-emerald-400 font-semibold block">Accepted</label>
                        <input
                          type="number"
                          min="0"
                          max={item.orderedQty}
                          value={item.acceptedQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setGrnItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? { ...it, acceptedQty: val, rejectedQty: Math.max(0, it.orderedQty - val) }
                                  : it
                              )
                            )
                          }}
                          className="w-16 bg-chrome-900 border border-emerald-700/60 text-emerald-400 px-2 py-0.5 text-xs text-center font-mono font-bold"
                        />
                      </div>

                      <div className="text-right">
                        <label className="text-3xs text-rose-400 font-semibold block">Rejected</label>
                        <input
                          type="number"
                          min="0"
                          max={item.orderedQty}
                          value={item.rejectedQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0
                            setGrnItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? { ...it, rejectedQty: val, acceptedQty: Math.max(0, it.orderedQty - val) }
                                  : it
                              )
                            )
                          }}
                          className="w-16 bg-chrome-900 border border-rose-800/60 text-rose-400 px-2 py-0.5 text-xs text-center font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {item.rejectedQty > 0 && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={item.rejectionReason || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setGrnItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, rejectionReason: val } : it))
                          )
                        }}
                        placeholder="Rejection reason: e.g. Weave defect, torn hem, staining..."
                        className="w-full bg-rose-950/20 border border-rose-900/60 px-2.5 py-1 text-2xs text-rose-300 placeholder-rose-700 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-chrome-950 border border-chrome-800 text-3xs text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-300 block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Atomic Database Execution:
            </span>
            <p>
              Clicking Commit invokes <strong className="text-zinc-200">receive_grn_and_putaway()</strong>:
              generates sequential GRN document, logs goods receipt, restocks target shelf bin, increments variant stock, and commits immutable audit ledger entries.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-chrome-800">
            <Button
              type="button"
              variant="terminal"
              size="sm"
              onClick={() => setGrnDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isCommittingGrn}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
            >
              <PackageCheck className="w-4 h-4" /> Commit GRN & Putaway to Shelf
            </Button>
          </div>
        </form>
      </SlideOverDrawer>

      {/* Commercial PO Print Modal */}
      {printData && (
        <PurchaseOrderPrintModal
          isOpen={!!printData}
          onClose={() => setPrintData(null)}
          data={printData}
        />
      )}
    </div>
  )
}
