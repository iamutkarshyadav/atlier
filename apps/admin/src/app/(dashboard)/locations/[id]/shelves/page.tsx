'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Warehouse,
  ArrowLeft,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  Printer,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { Button, Barcode } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getLocationById,
  getLocationZones,
  getLocationShelves,
  getShelfInventory,
  moveShelfStock,
  type StoreLocation,
  type LocationZone,
  type Shelf,
  type ShelfInventory,
  type ProductVariant,
} from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

interface ShelfWithInventory extends Shelf {
  items: Array<ShelfInventory & { variant?: ProductVariant }>
  totalItems: number
}

export default function LocationShelvesWmsPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params?.id as string

  const [location, setLocation] = useState<StoreLocation | null>(null)
  const [zones, setZones] = useState<LocationZone[]>([])
  const [shelves, setShelves] = useState<ShelfWithInventory[]>([])
  const [selectedZone, setSelectedZone] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [isLoading, setIsLoading] = useState(true)

  // Drawer 1: Add Shelf
  const [addShelfOpen, setAddShelfOpen] = useState(false)
  const [shelfZoneId, setShelfZoneId] = useState('')
  const [aisle, setAisle] = useState('A')
  const [rack, setRack] = useState('01')
  const [shelfLevel, setShelfLevel] = useState('A1')
  const [binPosition, setBinPosition] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('100')
  const [isSubmittingShelf, setIsSubmittingShelf] = useState(false)
  const [addShelfError, setAddShelfError] = useState<string | null>(null)

  // Drawer 2: Cycle Count & Stock Relocation
  const [activeShelf, setActiveShelf] = useState<ShelfWithInventory | null>(null)
  const [relocateDrawerOpen, setRelocateDrawerOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [destShelfId, setDestShelfId] = useState<string>('')
  const [moveQuantity, setMoveQuantity] = useState<string>('1')
  const [moveReason, setMoveReason] = useState<string>('reorganization')
  const [isRelocating, setIsRelocating] = useState(false)
  const [relocateSuccess, setRelocateSuccess] = useState<string | null>(null)
  const [relocateError, setRelocateError] = useState<string | null>(null)

  // Drawer 3: Print Shelf Label Modal
  const [printLabelShelf, setPrintLabelShelf] = useState<ShelfWithInventory | null>(null)

  const loadLocationData = async () => {
    if (!locationId) return
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [loc, zList, sList] = await Promise.all([
        getLocationById(supabase, locationId),
        getLocationZones(supabase, locationId),
        getLocationShelves(supabase, locationId),
      ])

      setLocation(loc)
      setZones(zList)
      if (zList.length > 0 && !shelfZoneId) {
        setShelfZoneId(zList[0]?.id || '')
      }

      // Fetch shelf inventory counts for each shelf
      const detailedShelves: ShelfWithInventory[] = await Promise.all(
        sList.map(async (sh) => {
          try {
            const items = await getShelfInventory(supabase, sh.id)
            const total = items.reduce((sum, it) => sum + it.quantity, 0)
            return { ...sh, items, totalItems: total }
          } catch {
            return { ...sh, items: [], totalItems: 0 }
          }
        })
      )

      setShelves(detailedShelves)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLocationData()
  }, [locationId])

  // Computed shelf coordinate for drawer preview
  const previewZone = zones.find((z) => z.id === shelfZoneId)
  const computedShelfCoordinate = useMemo(() => {
    const zoneCode = previewZone?.code || 'BLK'
    const parts = [zoneCode, aisle.trim().toUpperCase() || 'A', rack.trim() || '01', shelfLevel.trim().toUpperCase() || 'A1']
    if (binPosition.trim()) parts.push(binPosition.trim().toUpperCase())
    return parts.join('-')
  }, [previewZone, aisle, rack, shelfLevel, binPosition])

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingShelf(true)
    setAddShelfError(null)

    try {
      const supabase = createBrowserClient()
      const cap = parseInt(maxCapacity, 10) || 100

      const { error } = await supabase.from('shelves').insert({
        location_id: locationId,
        zone_id: shelfZoneId,
        coordinate: computedShelfCoordinate,
        barcode: computedShelfCoordinate,
        max_unit_capacity: cap,
        is_active: true,
      })

      if (error) throw error

      setAddShelfOpen(false)
      loadLocationData()
    } catch (err: any) {
      setAddShelfError(err?.message || 'Failed to create shelf')
    } finally {
      setIsSubmittingShelf(false)
    }
  }

  const handleExecuteRelocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeShelf || !selectedVariantId || !destShelfId) return

    setIsRelocating(true)
    setRelocateError(null)
    setRelocateSuccess(null)

    try {
      const supabase = createBrowserClient()
      const qty = parseInt(moveQuantity, 10) || 1

      const result = await moveShelfStock(supabase, {
        locationId,
        fromShelfId: activeShelf.id,
        toShelfId: destShelfId,
        variantId: selectedVariantId,
        quantity: qty,
        operatorId: 'admin',
        notes: moveReason,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to move shelf inventory')
      }

      setRelocateSuccess(`Successfully relocated ${qty} units to destination shelf.`)
      setTimeout(() => {
        setRelocateSuccess(null)
        setRelocateDrawerOpen(false)
        loadLocationData()
      }, 1200)
    } catch (err: any) {
      setRelocateError(err?.message || 'Stock relocation failed')
    } finally {
      setIsRelocating(false)
    }
  }

  const filteredShelves = useMemo(() => {
    if (selectedZone === 'ALL') return shelves
    return shelves.filter((sh) => {
      const zoneObj = zones.find((z) => z.id === sh.zone_id)
      return zoneObj?.code === selectedZone
    })
  }, [shelves, selectedZone, zones])

  const totalLocationStock = useMemo(() => {
    return shelves.reduce((sum, sh) => sum + sh.totalItems, 0)
  }, [shelves])

  return (
    <div className="space-y-4 font-mono">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div className="space-y-1">
          <Link
            href="/locations"
            className="inline-flex items-center gap-1.5 text-2xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Locations
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-400" />
              <span>{location?.code} — {location?.name}</span>
            </h1>
            <span className="text-3xs uppercase px-1.5 py-0.5 bg-chrome-900 text-zinc-400 border border-chrome-800">
              {location?.type?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-2xs text-zinc-400">
            {location?.city}, {location?.state} &bull; Total Sheltered Stock: <span className="text-emerald-400 font-semibold tabular-nums">{totalLocationStock} units</span> across {shelves.length} bins
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-chrome-900 border border-chrome-800 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-chrome-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Dense Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-chrome-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="2D Rack Grid Map"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="terminal"
            size="sm"
            onClick={loadLocationData}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setAddShelfOpen(true)}
            className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 rounded-none"
          >
            <Plus className="w-3.5 h-3.5" /> Add Shelf Bin
          </Button>
        </div>
      </div>

      {/* Zone Selector Tabs Ribbon */}
      <div className="flex items-center gap-1 border-b border-chrome-800 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedZone('ALL')}
          className={`px-3 py-1.5 text-2xs font-mono font-semibold transition-colors border-b-2 whitespace-nowrap ${
            selectedZone === 'ALL'
              ? 'border-emerald-500 text-zinc-100 bg-chrome-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-chrome-950'
          }`}
        >
          All Zones ({shelves.length})
        </button>
        {zones.map((z) => {
          const zoneShelvesCount = shelves.filter((s) => s.zone_id === z.id).length
          return (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.code)}
              className={`px-3 py-1.5 text-2xs font-mono font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                selectedZone === z.code
                  ? 'border-emerald-500 text-zinc-100 bg-chrome-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-chrome-950'
              }`}
            >
              <span>{z.code}</span>
              <span className="text-3xs font-normal text-zinc-500">[{z.name}]</span>
              <span className="px-1 text-3xs bg-chrome-800 text-zinc-400 rounded-none tabular-nums font-mono">
                {zoneShelvesCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* VIEW MODE 1: Dense Data Grid */}
      {viewMode === 'table' && (
        <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-3 font-semibold">Shelf Coordinate</th>
                <th className="py-2.5 px-3 font-semibold">Zone</th>
                <th className="py-2.5 px-3 font-semibold">Barcode Payload</th>
                <th className="py-2.5 px-3 font-semibold">Capacity Utilization</th>
                <th className="py-2.5 px-3 font-semibold text-center">Current Stock</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-800">
              {filteredShelves.map((sh) => {
                const zoneObj = zones.find((z) => z.id === sh.zone_id)
                const cap = sh.max_unit_capacity || 100
                const utilPercent = Math.min(100, Math.round((sh.totalItems / cap) * 100))
                const isOverfilled = sh.totalItems > cap

                return (
                  <tr key={sh.id} className="hover:bg-chrome-850 transition-colors">
                    {/* Shelf Coordinate */}
                    <td className="py-2.5 px-3 font-bold text-zinc-100 tabular-nums">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{sh.coordinate}</span>
                      </div>
                    </td>

                    {/* Zone */}
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 text-2xs uppercase bg-chrome-800 text-zinc-300 border border-chrome-750 font-semibold">
                        {zoneObj?.code || 'BLK'}
                      </span>
                    </td>

                    {/* Barcode */}
                    <td className="py-2.5 px-3 text-2xs text-zinc-400 tabular-nums font-mono">
                      {sh.barcode}
                    </td>

                    {/* Utilization Progress Bar */}
                    <td className="py-2.5 px-3 w-56">
                      <div className="space-y-1">
                        <div className="flex justify-between text-3xs text-zinc-500 tabular-nums">
                          <span>{sh.totalItems} / {cap} units</span>
                          <span className={isOverfilled ? 'text-rose-400 font-semibold' : 'text-zinc-400'}>
                            {utilPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-chrome-950 overflow-hidden border border-chrome-800">
                          <div
                            className={`h-full ${
                              isOverfilled
                                ? 'bg-rose-500'
                                : utilPercent > 80
                                ? 'bg-amber-500'
                                : utilPercent > 0
                                ? 'bg-emerald-500'
                                : 'bg-transparent'
                            }`}
                            style={{ width: `${Math.min(100, utilPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-semibold tabular-nums text-zinc-200 text-xs">
                        {sh.totalItems}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        variant={sh.totalItems === 0 ? 'empty' : isOverfilled ? 'quarantine' : 'in_stock'}
                        dot
                      >
                        {sh.totalItems === 0 ? 'Empty' : isOverfilled ? 'At Limit' : 'Stocked'}
                      </StatusBadge>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveShelf(sh)
                            setRelocateDrawerOpen(true)
                          }}
                          className="px-2 py-1 text-2xs bg-chrome-800 hover:bg-chrome-750 text-zinc-200 border border-chrome-700 transition-colors flex items-center gap-1"
                          title="Audit Inventory or Relocate Stock"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                          <span>Audit / Move</span>
                        </button>
                        <button
                          onClick={() => setPrintLabelShelf(sh)}
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-chrome-800 transition-colors border border-transparent hover:border-chrome-700"
                          title="Print Thermal Shelf Label"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredShelves.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                    No shelf bins found in this zone. Click &quot;Add Shelf Bin&quot; to expand capacity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODE 2: 2D Visual Rack Grid Map */}
      {viewMode === 'grid' && (
        <div className="bg-chrome-900 border border-chrome-800 p-4 space-y-4">
          <div className="flex items-center justify-between text-2xs text-zinc-400 border-b border-chrome-800 pb-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-300">
              2D Floor Plan & Rack Topography
            </span>
            <div className="flex items-center gap-3 text-3xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-chrome-950 border border-dashed border-zinc-700 inline-block" />
                Empty (0%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-950/60 border border-emerald-500/80 inline-block" />
                Optimal (1–80%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-amber-950/60 border border-amber-500/80 inline-block" />
                Near Capacity (&gt;80%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredShelves.map((sh) => {
              const cap = sh.max_unit_capacity || 100
              const utilPercent = Math.min(100, Math.round((sh.totalItems / cap) * 100))
              const isOverfilled = sh.totalItems > cap
              const isEmpty = sh.totalItems === 0

              return (
                <button
                  key={sh.id}
                  onClick={() => {
                    setActiveShelf(sh)
                    setRelocateDrawerOpen(true)
                  }}
                  className={`p-2.5 border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-28 font-mono ${
                    isEmpty
                      ? 'bg-chrome-950 border-zinc-800 hover:border-zinc-600'
                      : isOverfilled || utilPercent > 80
                      ? 'bg-amber-950/20 border-amber-800/80 hover:border-amber-500'
                      : 'bg-emerald-950/20 border-emerald-800/80 hover:border-emerald-500'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-3xs uppercase text-zinc-500 block truncate">
                      Bin Coordinate
                    </span>
                    <span className="text-xs font-bold text-zinc-100 block truncate">
                      {sh.coordinate}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-3xs tabular-nums">
                      <span className="text-zinc-400 font-semibold">{sh.totalItems} units</span>
                      <span className={isEmpty ? 'text-zinc-600' : 'text-emerald-400'}>{utilPercent}%</span>
                    </div>
                    <div className="h-1 w-full bg-chrome-950 overflow-hidden">
                      <div
                        className={`h-full ${
                          isEmpty ? 'bg-transparent' : utilPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${utilPercent}%` }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* DRAWER 1: Add Shelf Bin */}
      <SlideOverDrawer
        isOpen={addShelfOpen}
        onClose={() => setAddShelfOpen(false)}
        title="Provision Warehouse Shelf Bin"
        description="Creates an addressable bin in the WMS matrix with automated Code-128 coordinate barcode generation."
        width="max-w-xl"
      >
        <form onSubmit={handleCreateShelf} className="space-y-4">
          {addShelfError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addShelfError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Warehouse Zone *
            </label>
            <select
              value={shelfZoneId}
              onChange={(e) => setShelfZoneId(e.target.value)}
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code} — {z.name} ({z.type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Aisle *
              </label>
              <input
                type="text"
                value={aisle}
                onChange={(e) => setAisle(e.target.value.toUpperCase())}
                placeholder="A"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none uppercase text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Rack *
              </label>
              <input
                type="text"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                placeholder="01"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none tabular-nums text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Shelf Tier *
              </label>
              <input
                type="text"
                value={shelfLevel}
                onChange={(e) => setShelfLevel(e.target.value.toUpperCase())}
                placeholder="A1"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none uppercase text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Bin Sub-slot
              </label>
              <input
                type="text"
                value={binPosition}
                onChange={(e) => setBinPosition(e.target.value.toUpperCase())}
                placeholder="01"
                className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none uppercase text-center"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Maximum Unit Capacity
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none tabular-nums"
            />
          </div>

          {/* 75 x 50 mm Thermal Label Preview */}
          <div className="space-y-1 pt-2">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              75 x 50 mm Thermal Shelf Label Preview
            </label>
            <div className="p-4 bg-white text-black border border-zinc-300 font-mono space-y-2 select-none shadow-md">
              <div className="flex justify-between items-center text-[10px] border-b border-black pb-1">
                <span className="font-bold">{location?.code} WMS</span>
                <span className="uppercase font-semibold">ZONE: {previewZone?.code || 'BLK'}</span>
              </div>
              <div className="text-center py-1">
                <span className="text-xl font-black tracking-widest block">{computedShelfCoordinate}</span>
                <span className="text-[10px] text-zinc-700">
                  Aisle {aisle || 'A'} &bull; Rack {rack || '01'} &bull; Level {shelfLevel || 'A1'}
                </span>
              </div>
              <div className="flex justify-center py-1 bg-white">
                <Barcode value={computedShelfCoordinate} height={36} width={1.8} displayValue={false} />
              </div>
              <div className="flex justify-between items-center text-[9px] pt-1 border-t border-zinc-300">
                <span>CAP: {maxCapacity} PCS</span>
                <span>ATELIER OMNICHANNEL</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="terminal"
              size="sm"
              onClick={() => setAddShelfOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSubmittingShelf}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none"
            >
              Create Shelf Bin
            </Button>
          </div>
        </form>
      </SlideOverDrawer>

      {/* DRAWER 2: Cycle Count Audit & Stock Relocation */}
      <SlideOverDrawer
        isOpen={relocateDrawerOpen}
        onClose={() => setRelocateDrawerOpen(false)}
        title={`Shelf Audit & Relocation: ${activeShelf?.coordinate}`}
        description="Inspect variants currently on this shelf, adjust cycle counts, or relocate inventory to another bin via atomic ledger transfer."
        width="max-w-xl"
      >
        <div className="space-y-4">
          {relocateSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{relocateSuccess}</span>
            </div>
          )}

          {relocateError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{relocateError}</span>
            </div>
          )}

          {/* Shelf summary tile */}
          <div className="p-3 bg-chrome-950 border border-chrome-800 grid grid-cols-3 gap-2 text-2xs">
            <div>
              <span className="text-zinc-500 uppercase block">Shelf Coordinate</span>
              <span className="font-bold text-zinc-200">{activeShelf?.coordinate}</span>
            </div>
            <div>
              <span className="text-zinc-500 uppercase block">Total On Shelf</span>
              <span className="font-bold text-emerald-400 tabular-nums">{activeShelf?.totalItems} units</span>
            </div>
            <div>
              <span className="text-zinc-500 uppercase block">Max Capacity</span>
              <span className="font-bold text-zinc-300 tabular-nums">{activeShelf?.max_unit_capacity} units</span>
            </div>
          </div>

          {/* Current Variants on this Shelf */}
          <div className="space-y-2">
            <span className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Stocked Garment Variants ({activeShelf?.items.length || 0})
            </span>

            <div className="border border-chrome-800 divide-y divide-chrome-800 max-h-56 overflow-y-auto bg-chrome-950">
              {activeShelf?.items.map((item) => {
                const isSelected = selectedVariantId === item.variant_id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedVariantId(item.variant_id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-chrome-850 border-l-2 border-emerald-500' : 'hover:bg-chrome-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 text-xs">
                          {item.variant?.sku || 'Garment SKU'}
                        </span>
                        <span className="px-1 text-3xs font-mono uppercase bg-chrome-800 text-zinc-400 border border-chrome-750">
                          Size {item.variant?.size || 'Standard'}
                        </span>
                      </div>
                      <span className="text-3xs text-zinc-500 font-mono tabular-nums">
                        ID: {item.variant_id}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">
                        {item.quantity} units
                      </span>
                      {isSelected && (
                        <span className="text-3xs text-zinc-400 block">Selected for Move</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {(!activeShelf?.items || activeShelf.items.length === 0) && (
                <div className="p-6 text-center text-xs text-zinc-500">
                  This shelf bin has zero units. Stock can be received into it via Goods Receipt (GRN) or inter-shelf relocation.
                </div>
              )}
            </div>
          </div>

          {/* Relocation Form */}
          {activeShelf && activeShelf.items.length > 0 && (
            <form onSubmit={handleExecuteRelocation} className="space-y-3 pt-3 border-t border-chrome-800">
              <span className="text-2xs uppercase tracking-wider text-zinc-300 font-semibold block flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                Relocate Stock to Another Shelf
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                    Destination Shelf *
                  </label>
                  <select
                    value={destShelfId}
                    onChange={(e) => setDestShelfId(e.target.value)}
                    required
                    className="w-full bg-chrome-950 border border-chrome-800 px-2 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  >
                    <option value="">Select destination shelf...</option>
                    {shelves
                      .filter((s) => s.id !== activeShelf.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.coordinate} ({s.totalItems}/{s.max_unit_capacity} units)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                    Quantity to Relocate *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={activeShelf.items.find((it) => it.variant_id === selectedVariantId)?.quantity || 1}
                    value={moveQuantity}
                    onChange={(e) => setMoveQuantity(e.target.value)}
                    required
                    className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                  Relocation Audit Reason
                </label>
                <select
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none"
                >
                  <option value="reorganization">Warehouse Reorganization / Consolidation</option>
                  <option value="replenishment_to_floor">Replenishment to Sales Floor (FLR)</option>
                  <option value="quarantine_damaged">Move Damaged to Quarantine (QRN)</option>
                  <option value="cycle_count_adjustment">Cycle Count Audit Adjustment</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="terminal"
                  size="sm"
                  onClick={() => setRelocateDrawerOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  isLoading={isRelocating}
                  disabled={!selectedVariantId || !destShelfId}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none"
                >
                  Execute Relocation
                </Button>
              </div>
            </form>
          )}
        </div>
      </SlideOverDrawer>

      {/* DRAWER 3: Thermal Shelf Label Modal */}
      {printLabelShelf && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-chrome-900 border border-chrome-800 p-4 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-chrome-800 pb-2">
              <span className="font-semibold text-zinc-200 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Print 75 x 50 mm Shelf Label
              </span>
              <button
                onClick={() => setPrintLabelShelf(null)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Print Label Container */}
            <div className="p-4 bg-white text-black border border-zinc-300 font-mono space-y-2 select-none shadow-inner">
              <div className="flex justify-between items-center text-[10px] border-b border-black pb-1">
                <span className="font-bold">{location?.code} WMS</span>
                <span className="uppercase font-semibold">BARCODE READY</span>
              </div>
              <div className="text-center py-2">
                <span className="text-2xl font-black tracking-widest block">
                  {printLabelShelf.coordinate}
                </span>
                <span className="text-[10px] text-zinc-700">
                  STANDARD WMS SYMBOLOGY
                </span>
              </div>
              <div className="flex justify-center py-1 bg-white">
                <Barcode value={printLabelShelf.coordinate} height={40} width={2} displayValue={false} />
              </div>
              <div className="flex justify-between items-center text-[9px] pt-1 border-t border-zinc-300">
                <span>MAX CAP: {printLabelShelf.max_unit_capacity} UNITS</span>
                <span>ATELIER OMNICHANNEL</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="terminal"
                size="sm"
                onClick={() => setPrintLabelShelf(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => window.print()}
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Send to Zebra / TSC Printer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
