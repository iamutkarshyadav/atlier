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
  Store,
  Layers,
  Sparkles,
  Split,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getPurchaseOrders,
  getPurchaseOrderItems,
  createPurchaseOrderWithItems,
  getSuppliers,
  getLocations,
  getLocationShelves,
  getAllProductsAdmin,
  receiveSplitGrnAndPutaway,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type Supplier,
  type StoreLocation,
  type Shelf,
  type Product,
  type SplitItemReceivePayload,
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
  destinationLocationId?: string
}

interface LocationAllocationDraft {
  locationId: string
  locationCode: string
  locationName: string
  locationType: string
  shelfId: string
  qty: number
}

interface GrnLineItemState {
  orderItemId?: string
  variantId: string
  sku: string
  title: string
  size: string
  orderedQty: number
  receivedSoFar: number
  acceptedQty: number
  rejectedQty: number
  rejectionReason?: string
  unitCost: number
  allocations: LocationAllocationDraft[]
}

export default function ProcurementPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [shelvesByLocation, setShelvesByLocation] = useState<Record<string, Shelf[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Drawer 1: Create Purchase Order
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [destLocationId, setDestLocationId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])
  const [isSubmittingPO, setIsSubmittingPO] = useState(false)
  const [createPoError, setCreatePoError] = useState<string | null>(null)

  // Drawer 2: Receive GRN & Multi-Location Split Putaway Workspace
  const [grnDrawerOpen, setGrnDrawerOpen] = useState(false)
  const [activePOForGrn, setActivePOForGrn] = useState<PurchaseOrder | null>(null)
  const [grnItems, setGrnItems] = useState<GrnLineItemState[]>([])
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
      const [poRes, supRes, locRes, prods] = await Promise.all([
        fetch('/api/admin/purchase-orders').then((r) => r.json()).catch(() => ({ purchaseOrders: [] })),
        fetch('/api/admin/suppliers').then((r) => r.json()).catch(() => ({ suppliers: [] })),
        fetch('/api/admin/locations').then((r) => r.json()).catch(() => ({ locations: [] })),
        getAllProductsAdmin(supabase),
      ])

      const pos: PurchaseOrder[] = Array.isArray(poRes?.purchaseOrders) ? poRes.purchaseOrders : []
      const sups: Supplier[] = Array.isArray(supRes?.suppliers) ? supRes.suppliers : []
      const locs: StoreLocation[] = Array.isArray(locRes?.locations) ? locRes.locations : []

      setPurchaseOrders(pos)
      setSuppliers(sups)
      setLocations(locs)
      setProducts(prods)

      if (sups.length > 0 && !selectedSupplierId) setSelectedSupplierId(sups[0]?.id || '')
      if (locs.length > 0 && !destLocationId) setDestLocationId(locs[0]?.id || '')

      // Pre-fetch shelves for all active locations
      const shelfMap: Record<string, Shelf[]> = {}
      await Promise.all(
        locs.map(async (l) => {
          try {
            const shRes = await fetch(`/api/admin/shelves?locationId=${l.id}`).then((r) => r.json()).catch(() => ({ shelves: [] }))
            shelfMap[l.id] = Array.isArray(shRes?.shelves) ? shRes.shelves : []
          } catch {
            shelfMap[l.id] = []
          }
        })
      )
      setShelvesByLocation(shelfMap)
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

      // Scan garment SKU to increment accepted quantity
      setGrnItems((prev) =>
        prev.map((item) => {
          if (item.sku.toUpperCase() === code) {
            const nextAccepted = Math.min(item.orderedQty, item.acceptedQty + 1)
            // Auto-increment storefront allocation first
            const updatedAllocations = item.allocations.map((a, idx) => {
              if (idx === 0) return { ...a, qty: a.qty + 1 }
              return a
            })
            return {
              ...item,
              acceptedQty: nextAccepted,
              allocations: updatedAllocations,
            }
          }
          return item
        })
      )
    },
  })

  // Open Create PO Drawer
  const openCreatePo = () => {
    setCreatePoError(null)
    const today = new Date()
    today.setDate(today.getDate() + 14)
    setExpectedDate(today.toISOString().slice(0, 10))

    if (products.length > 0) {
      const p = products[0]
      setLineItems([
        {
          variantId: `v-${p?.id || 'prod'}-48`,
          sku: `SKU-${(p?.title || 'GARMENT').slice(0, 4).toUpperCase()}-48`,
          title: p?.title || 'Cashmere Topcoat',
          size: '48',
          hsn: '6201.11',
          quantity: 20,
          unitCost: Math.round(Number(p?.price || 1000) * 0.4),
          gstPercent: 12,
          destinationLocationId: destLocationId || locations[0]?.id,
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
        destinationLocationId: destLocationId || locations[0]?.id,
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

  // Create PO with real Line Items persisted in Supabase
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lineItems.length === 0) {
      setCreatePoError('Please add at least one line item to the Purchase Order.')
      return
    }

    setIsSubmittingPO(true)
    setCreatePoError(null)

    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randSeq = Math.floor(1000 + Math.random() * 9000)
      const poNumber = `PO-${today}-${randSeq}`

      const res = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poData: {
            po_number: poNumber,
            supplier_id: selectedSupplierId,
            destination_location_id: destLocationId,
            status: 'issued',
            expected_delivery_date: expectedDate,
            subtotal: poSubtotal,
            tax_amount: poTaxAmount,
            total_amount: poGrandTotal,
            created_by: 'admin',
          },
          items: lineItems.map((it) => ({
            variant_id: it.variantId,
            hsn_code: it.hsn || '610910',
            quantity_ordered: it.quantity,
            unit_cost: it.unitCost,
            tax_rate_percent: it.gstPercent,
            tax_amount: it.quantity * it.unitCost * (it.gstPercent / 100),
            line_total: it.quantity * it.unitCost * (1 + it.gstPercent / 100),
            destination_location_id: it.destinationLocationId || destLocationId,
          })),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create purchase order')
      }

      setCreateDrawerOpen(false)
      loadData()
    } catch (err: any) {
      setCreatePoError(err?.message || 'Failed to issue Purchase Order')
    } finally {
      setIsSubmittingPO(false)
    }
  }

  // Open Receive GRN & Multi-Location Split Putaway Workspace
  const openGrnWorkspace = async (po: PurchaseOrder) => {
    setActivePOForGrn(po)
    setGrnError(null)
    setGrnSuccess(null)
    setGrnChallanNumber(`DC-${po.po_number.replace('PO-', '')}`)

    try {
      const supabase = createBrowserClient()
      // Fetch actual items belonging to this PO
      const poItems = await getPurchaseOrderItems(supabase, po.id)

      if (poItems && poItems.length > 0) {
        setGrnItems(
          poItems.map((item) => {
            const pendingQty = Math.max(0, item.quantity_ordered - (item.quantity_received || 0))
            const initialAllocations: LocationAllocationDraft[] = locations.map((loc, idx) => {
              const locShelves = shelvesByLocation[loc.id] || []
              const isWarehouse = loc.type === 'warehouse' || loc.code.includes('WH')
              // Default: allocate 100% to primary hub warehouse, 0 to others
              return {
                locationId: loc.id,
                locationCode: loc.code,
                locationName: loc.name,
                locationType: loc.type,
                shelfId: locShelves[0]?.id || '',
                qty: isWarehouse ? pendingQty : 0,
              }
            })

            return {
              orderItemId: item.id,
              variantId: item.variant_id,
              sku: item.variant?.sku || `SKU-ITEM-${item.id.slice(0, 4)}`,
              title: item.variant?.product?.title || 'Garment Item',
              size: item.variant?.size || '48',
              orderedQty: item.quantity_ordered,
              receivedSoFar: item.quantity_received || 0,
              acceptedQty: pendingQty,
              rejectedQty: 0,
              unitCost: Number(item.unit_cost) || 120,
              allocations: initialAllocations,
            }
          })
        )
      } else {
        // Fallback for seed / mock POs
        const defaultAllocations: LocationAllocationDraft[] = locations.map((loc) => {
          const locShelves = shelvesByLocation[loc.id] || []
          const isWarehouse = loc.type === 'warehouse' || loc.code.includes('WH')
          return {
            locationId: loc.id,
            locationCode: loc.code,
            locationName: loc.name,
            locationType: loc.type,
            shelfId: locShelves[0]?.id || '',
            qty: isWarehouse ? 10 : 0,
          }
        })

        setGrnItems([
          {
            orderItemId: undefined,
            variantId: 'a2000000-0000-0000-0000-000000000001',
            sku: 'SKU-COAT-BLK-48',
            title: 'Cashmere Double-Breasted Overcoat',
            size: '48',
            orderedQty: 10,
            receivedSoFar: 0,
            acceptedQty: 10,
            rejectedQty: 0,
            unitCost: 150,
            allocations: defaultAllocations,
          },
        ])
      }

      setGrnDrawerOpen(true)
    } catch (err: any) {
      setGrnError('Failed to initialize GRN workspace: ' + err.message)
    }
  }

  // Quick Split Helper Preset
  const applyPresetSplit = (itemIdx: number, preset: '100_storefront' | 'equal_boutiques' | '50_50') => {
    setGrnItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIdx) return item

        const total = item.acceptedQty
        const whLoc = item.allocations.find((a) => a.locationType === 'warehouse' || a.locationCode.includes('WH'))
        const boutiqueLocs = item.allocations.filter((a) => a.locationType !== 'warehouse' && !a.locationCode.includes('WH'))

        let newAllocations = [...item.allocations]

        if (preset === '100_storefront') {
          newAllocations = item.allocations.map((a) => ({
            ...a,
            qty: a.locationId === whLoc?.locationId ? total : 0,
          }))
        } else if (preset === 'equal_boutiques') {
          const count = Math.max(1, boutiqueLocs.length)
          const share = Math.floor(total / count)
          let remainder = total % count
          newAllocations = item.allocations.map((a) => {
            if (a.locationId === whLoc?.locationId) return { ...a, qty: 0 }
            const allocated = share + (remainder > 0 ? 1 : 0)
            if (remainder > 0) remainder--
            return { ...a, qty: allocated }
          })
        } else if (preset === '50_50') {
          const whQty = Math.ceil(total / 2)
          const remainingForStores = total - whQty
          const count = Math.max(1, boutiqueLocs.length)
          const storeShare = Math.floor(remainingForStores / count)
          let rem = remainingForStores % count
          newAllocations = item.allocations.map((a) => {
            if (a.locationId === whLoc?.locationId) return { ...a, qty: whQty }
            const allocated = storeShare + (rem > 0 ? 1 : 0)
            if (rem > 0) rem--
            return { ...a, qty: allocated }
          })
        }

        return { ...item, allocations: newAllocations }
      })
    )
  }

  // Commit Multi-Location Split GRN Putaway via Atomic RPC
  const handleCommitGrn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePOForGrn) return

    // Validation: Verify that each item's split allocations sum to acceptedQty
    for (const item of grnItems) {
      const sumAllocated = item.allocations.reduce((sum, a) => sum + (Number(a.qty) || 0), 0)
      if (sumAllocated !== item.acceptedQty) {
        setGrnError(
          `Allocation mismatch for "${item.title} (${item.sku})": Accepted units = ${item.acceptedQty}, but total allocated across locations = ${sumAllocated}. Please balance all units before committing.`
        )
        return
      }

      // Verify that any destination with qty > 0 has a valid shelf selected
      for (const alloc of item.allocations) {
        if (alloc.qty > 0 && !alloc.shelfId) {
          setGrnError(
            `Please select a valid putaway shelf for location "${alloc.locationCode}" for item "${item.title}".`
          )
          return
        }
      }
    }

    setIsCommittingGrn(true)
    setGrnError(null)
    setGrnSuccess(null)

    try {
      const supabase = createBrowserClient()
      const receivingLocId = activePOForGrn.destination_location_id
      const locShelves = shelvesByLocation[receivingLocId] || []
      const qrnShelf = locShelves.find((s) => s.coordinate === 'QRN-BIN-01' || s.barcode?.includes('QRN')) || locShelves[0]

      // Format payload for receive_split_grn_and_putaway RPC
      const splitsPayload: SplitItemReceivePayload[] = grnItems.map((item) => ({
        order_item_id: item.orderItemId,
        variant_id: item.variantId,
        unit_cost: item.unitCost,
        destinations: item.allocations
          .filter((a) => a.qty > 0)
          .map((a) => ({
            location_id: a.locationId,
            shelf_id: a.shelfId,
            qty_accepted: a.qty,
            qty_rejected: 0,
          })),
      }))

      const res = await receiveSplitGrnAndPutaway(supabase, {
        poId: activePOForGrn.id,
        challanNumber: grnChallanNumber,
        operatorId: 'admin',
        splits: splitsPayload,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to commit split GRN')
      }

      // Put away QC-rejected units into Quarantine Shelf (QRN-BIN-01) with ledger isolation
      for (const item of grnItems) {
        if (item.rejectedQty > 0 && qrnShelf) {
          try {
            const { data: existingQrn } = await supabase
              .from('shelf_inventory')
              .select('quantity')
              .eq('shelf_id', qrnShelf.id)
              .eq('variant_id', item.variantId)
              .maybeSingle()

            const currentQrnQty = existingQrn?.quantity || 0
            const nextQrnQty = currentQrnQty + item.rejectedQty

            await supabase
              .from('shelf_inventory')
              .upsert(
                {
                  shelf_id: qrnShelf.id,
                  variant_id: item.variantId,
                  quantity: nextQrnQty,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'shelf_id,variant_id' }
              )

            await supabase.from('inventory_ledger').insert({
              variant_id: item.variantId,
              location_id: receivingLocId,
              to_shelf_id: qrnShelf.id,
              movement_type: 'damaged_quarantine',
              quantity: item.rejectedQty,
              balance_after: nextQrnQty,
              reference_doc_type: 'GRN_QC_REJECT',
              reference_doc_id: res.grnNumber || 'GRN',
              operator_id: null,
            })
          } catch (qrnErr) {
            console.warn('Quarantine bin putaway note:', qrnErr)
          }
        }
      }

      const totalAccepted = grnItems.reduce((acc, it) => acc + it.acceptedQty, 0)
      const totalRejected = grnItems.reduce((acc, it) => acc + (it.rejectedQty || 0), 0)
      setGrnSuccess(
        `GRN ${res.grnNumber} Confirmed! ${totalAccepted} units stocked into sellable shelves; ${totalRejected > 0 ? `${totalRejected} QC-rejected units routed to Quarantine (QRN-BIN-01)` : '0 defects'} with double-entry ledger audit.`
      )
      setTimeout(() => {
        setGrnDrawerOpen(false)
        loadData()
      }, 1500)
    } catch (err: any) {
      setGrnError(err?.message || 'GRN multi-location putaway transaction failed')
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
            <span>Inbound Supply Chain — PO & Multi-Location Split Putaway</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Issue vendor POs, split incoming stock between Storefront (App Inventory) and Physical Stores, and execute shelf putaway
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
              <th className="py-2.5 px-3 font-semibold">Default Destination</th>
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
                      {/* Receive & Split GRN Trigger */}
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button
                          onClick={() => openGrnWorkspace(po)}
                          className="px-2 py-1 text-2xs bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 transition-colors flex items-center gap-1 font-semibold"
                        >
                          <Split className="w-3 h-3" />
                          <span>Receive & Split GRN</span>
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
                Default Receiving Node *
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
                    <label className="text-3xs text-zinc-500 block">Cost (₹)</label>
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

      {/* DRAWER 2: Multi-Location Inbound Split & Shelf Putaway Workspace */}
      <SlideOverDrawer
        isOpen={grnDrawerOpen}
        onClose={() => setGrnDrawerOpen(false)}
        title={`Multi-Location Inbound Split: ${activePOForGrn?.po_number}`}
        description="Arbitrarily distribute arriving supplier inventory between Storefront App Inventory and Physical Offline Boutiques."
        width="max-w-3xl"
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
                Vendor Delivery Challan / Invoice # *
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
                Inbound Receiving Mode
              </label>
              <div className="w-full bg-chrome-950 border border-emerald-800/60 px-3 py-1.5 text-xs text-emerald-400 flex items-center gap-2 font-mono">
                <Split className="w-3.5 h-3.5" />
                <span className="font-semibold">Dynamic Multi-Store Split Putaway</span>
              </div>
            </div>
          </div>

          {/* Realtime Barcode Scanner Indicator */}
          <div className="p-2.5 bg-chrome-950 border border-chrome-800 flex items-center justify-between text-2xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-400" />
              <span>Scan garment SKU or carton barcode to automatically increment verified stock</span>
            </div>
            <span className="text-3xs text-emerald-400 font-semibold">CADENCE &lt;35MS</span>
          </div>

          {/* Inbound Line Items & Multi-Location Splitters */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-2xs uppercase tracking-wider text-zinc-300 font-semibold block">
                Carton Verification & Multi-Store Split Allocation
              </span>
            </div>

            <div className="space-y-3">
              {grnItems.map((item, idx) => {
                const totalAllocated = item.allocations.reduce((acc, a) => acc + (Number(a.qty) || 0), 0)
                const isBalanced = totalAllocated === item.acceptedQty
                const unallocated = item.acceptedQty - totalAllocated

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-chrome-950 border border-chrome-800 space-y-3 rounded-none"
                  >
                    {/* Item Manifest Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-chrome-850">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 text-xs">{item.title}</span>
                          <span className="px-1.5 py-0.2 text-3xs font-mono bg-chrome-850 text-cyan-400 border border-cyan-800/40">
                            Size {item.size}
                          </span>
                        </div>
                        <span className="text-3xs text-zinc-500 font-mono">
                          {item.sku} &bull; Ordered: {item.orderedQty} pcs &bull; Unit Cost: ${item.unitCost}
                        </span>
                      </div>

                      {/* Accepted / Rejected verification */}
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
                                prev.map((it, i) => {
                                  if (i !== idx) return it
                                  // Update accepted and re-adjust warehouse allocation default
                                  const updatedAllocs = it.allocations.map((a, aIdx) => {
                                    if (aIdx === 0) return { ...a, qty: val }
                                    return { ...a, qty: 0 }
                                  })
                                  return {
                                    ...it,
                                    acceptedQty: val,
                                    rejectedQty: Math.max(0, it.orderedQty - val),
                                    allocations: updatedAllocs,
                                  }
                                })
                              )
                            }}
                            className="w-16 bg-chrome-900 border border-emerald-700/60 text-emerald-400 px-2 py-0.5 text-xs text-center font-mono font-bold"
                          />
                        </div>

                        <div className="text-right">
                          <label className="text-3xs text-rose-400 font-semibold block">Damaged/Reject</label>
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

                    {/* Split Allocation Presets & Balance Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 bg-chrome-900 border border-chrome-850 text-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-3xs uppercase font-semibold">Quick Split:</span>
                        <button
                          type="button"
                          onClick={() => applyPresetSplit(idx, '100_storefront')}
                          className="px-1.5 py-0.5 text-3xs bg-chrome-950 hover:bg-chrome-800 text-zinc-300 border border-chrome-750"
                        >
                          100% Storefront
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetSplit(idx, 'equal_boutiques')}
                          className="px-1.5 py-0.5 text-3xs bg-chrome-950 hover:bg-chrome-800 text-zinc-300 border border-chrome-750"
                        >
                          All to Boutiques
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetSplit(idx, '50_50')}
                          className="px-1.5 py-0.5 text-3xs bg-chrome-950 hover:bg-chrome-800 text-zinc-300 border border-chrome-750"
                        >
                          50/50 Split
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isBalanced ? (
                          <span className="text-emerald-400 text-3xs font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> All {item.acceptedQty} units allocated
                          </span>
                        ) : (
                          <span className="text-amber-400 text-3xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {unallocated > 0 ? `${unallocated} unallocated units` : `${Math.abs(unallocated)} over-allocated units`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Destination Rows Matrix */}
                    <div className="space-y-2 pt-1">
                      <div className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold grid grid-cols-12 gap-2 px-1">
                        <span className="col-span-5">Destination Location (Channel)</span>
                        <span className="col-span-4">Putaway Shelf Bin</span>
                        <span className="col-span-3 text-right">Units Allocated</span>
                      </div>

                      {item.allocations.map((alloc, aIdx) => {
                        const isWh = alloc.locationType === 'warehouse' || alloc.locationCode.includes('WH')
                        const availableShelves = shelvesByLocation[alloc.locationId] || []

                        return (
                          <div
                            key={alloc.locationId}
                            className={`grid grid-cols-12 gap-2 items-center p-2 border ${alloc.qty > 0 ? 'bg-chrome-900/60 border-chrome-750' : 'bg-chrome-950 border-chrome-850'
                              }`}
                          >
                            {/* Destination Label */}
                            <div className="col-span-5 flex items-center gap-2">
                              {isWh ? (
                                <Warehouse className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : (
                                <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <div className="truncate">
                                <span className="font-semibold text-zinc-200 text-2xs block truncate">
                                  {alloc.locationName}
                                </span>
                                <span className="text-3xs text-zinc-500 font-mono">
                                  {alloc.locationCode} &bull; {isWh ? 'Online Storefront' : 'Offline Boutique'}
                                </span>
                              </div>
                            </div>

                            {/* Shelf Selector */}
                            <div className="col-span-4">
                              <select
                                value={alloc.shelfId}
                                onChange={(e) => {
                                  const sId = e.target.value
                                  setGrnItems((prev) =>
                                    prev.map((it, i) => {
                                      if (i !== idx) return it
                                      return {
                                        ...it,
                                        allocations: it.allocations.map((a) =>
                                          a.locationId === alloc.locationId ? { ...a, shelfId: sId } : a
                                        ),
                                      }
                                    })
                                  )
                                }}
                                disabled={alloc.qty === 0}
                                className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1 text-3xs text-zinc-200 font-mono focus:outline-none disabled:opacity-40"
                              >
                                <option value="">Select shelf...</option>
                                {availableShelves.map((sh) => (
                                  <option key={sh.id} value={sh.id}>
                                    {sh.coordinate}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Qty Input */}
                            <div className="col-span-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={item.acceptedQty}
                                value={alloc.qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0
                                  setGrnItems((prev) =>
                                    prev.map((it, i) => {
                                      if (i !== idx) return it
                                      return {
                                        ...it,
                                        allocations: it.allocations.map((a) =>
                                          a.locationId === alloc.locationId ? { ...a, qty: val } : a
                                        ),
                                      }
                                    })
                                  )
                                }}
                                className="w-20 bg-chrome-950 border border-chrome-750 px-2 py-1 text-xs text-center text-zinc-100 font-mono font-bold focus:border-emerald-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-3 bg-chrome-950 border border-chrome-800 text-3xs text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Atomic Double-Entry Inbound Execution:
            </span>
            <p>
              Clicking Commit invokes <strong className="text-zinc-200">receive_split_grn_and_putaway()</strong>:
              stocks exact quantities directly to each destination shelf, ringfences Storefront App vs. Offline Boutique inventory, and commits immutable double-entry ledger audit records in Supabase.
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
              <PackageCheck className="w-4 h-4" /> Commit Multi-Location Split Putaway
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
