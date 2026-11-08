'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Warehouse,
  Store,
  Plus,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getLocations,
  getLocationZones,
  getLocationShelves,
  type StoreLocation,
} from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

interface LocationWithStats extends StoreLocation {
  zoneCount: number
  shelfCount: number
}

const DEFAULT_ZONES = [
  { code: 'RCV', name: 'Receiving Dock', type: 'receiving_dock' as const },
  { code: 'BLK', name: 'Bulk Storage', type: 'bulk_storage' as const },
  { code: 'FLR', name: 'Sales Floor', type: 'sales_floor' as const },
  { code: 'QRN', name: 'Quarantine & Returns', type: 'fitting_room_quarantine' as const },
  { code: 'BCK', name: 'Backroom Reserve', type: 'backroom_stock' as const },
]

export default function LocationsWmsPage() {
  const [locations, setLocations] = useState<LocationWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Drawer Form State
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'warehouse' | 'boutique' | 'quarantine'>('boutique')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [gstin, setGstin] = useState('')

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const locs = await getLocations(supabase)

      // Fetch zone & shelf stats for each location
      const detailedLocs: LocationWithStats[] = await Promise.all(
        locs.map(async (loc) => {
          try {
            const [zones, shelves] = await Promise.all([
              getLocationZones(supabase, loc.id),
              getLocationShelves(supabase, loc.id),
            ])
            return {
              ...loc,
              zoneCount: zones.length,
              shelfCount: shelves.length,
            }
          } catch {
            return {
              ...loc,
              zoneCount: 0,
              shelfCount: 0,
            }
          }
        })
      )

      setLocations(detailedLocs)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [])

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const supabase = createBrowserClient()
      const cleanCode = code.trim().toUpperCase()

      // 1. Insert Location
      const { data: newLoc, error: locErr } = await supabase
        .from('locations')
        .insert({
          code: cleanCode,
          name: name.trim(),
          type,
          address_line1: address.trim() || 'Address On File',
          city: city.trim() || 'Bengaluru',
          state: state.trim() || 'Karnataka',
          state_code: state.trim().slice(0, 2).toUpperCase() || '29',
          pincode: pincode.trim() || '560001',
          phone: '+91 80 4000 0000',
          gstin: gstin.trim() || '29AAAAA0000A1Z5',
          is_active: true,
          online_fulfillment_priority: 20,
          online_safety_buffer: 1,
        })
        .select()
        .single()

      if (locErr) {
        throw new Error(locErr.message)
      }

      // 2. Automatically generate default zones for this location
      if (newLoc?.id) {
        const zoneInserts = DEFAULT_ZONES.map((z) => ({
          location_id: newLoc.id,
          code: z.code,
          name: z.name,
          type: z.type,
        }))

        await supabase.from('location_zones').insert(zoneInserts)
      }

      setFormSuccess(`Location ${cleanCode} and default WMS zones created successfully.`)
      setTimeout(() => {
        setDrawerOpen(false)
        setCode('')
        setName('')
        setAddress('')
        setCity('')
        setState('')
        setPincode('')
        setGstin('')
        setFormSuccess(null)
        loadLocations()
      }, 1000)
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create location')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-emerald-400" />
            <span>Locations & Shelf-Level WMS Topology</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Mother warehouses, physical boutiques, shelf bins, and zone hierarchies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadLocations}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 rounded-none"
          >
            <Plus className="w-3.5 h-3.5" /> Add Location
          </Button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 font-semibold">Location Code</th>
              <th className="py-2.5 px-3 font-semibold">Node Name & Type</th>
              <th className="py-2.5 px-3 font-semibold">City & State</th>
              <th className="py-2.5 px-3 font-semibold">GSTIN</th>
              <th className="py-2.5 px-3 font-semibold text-center">WMS Zones</th>
              <th className="py-2.5 px-3 font-semibold text-center">Shelf Bins</th>
              <th className="py-2.5 px-3 font-semibold">Status</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome-800">
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-chrome-850 transition-colors">
                {/* Code */}
                <td className="py-2.5 px-3 font-bold text-zinc-100 tabular-nums">
                  <div className="flex items-center gap-1.5">
                    {loc.type === 'warehouse' ? (
                      <Warehouse className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Store className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{loc.code}</span>
                  </div>
                </td>

                {/* Name & Type */}
                <td className="py-2.5 px-3">
                  <div className="text-zinc-200 font-semibold">{loc.name}</div>
                  <div className="text-3xs text-zinc-500 uppercase">{loc.type.replace('_', ' ')}</div>
                </td>

                {/* City & State */}
                <td className="py-2.5 px-3 text-zinc-400 text-2xs">
                  <div>{loc.city ? `${loc.city}, ${loc.state}` : 'Unspecified'}</div>
                  <div className="text-3xs text-zinc-500 tabular-nums">{loc.pincode}</div>
                </td>

                {/* GSTIN */}
                <td className="py-2.5 px-3 text-zinc-400 text-2xs tabular-nums">
                  {loc.gstin || '—'}
                </td>

                {/* Zone Count */}
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 text-2xs bg-chrome-800 text-zinc-300 border border-chrome-750 tabular-nums font-semibold">
                    {loc.zoneCount || 5} Zones
                  </span>
                </td>

                {/* Shelf Count */}
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 text-2xs bg-chrome-800 text-emerald-400 border border-chrome-750 tabular-nums font-semibold">
                    {loc.shelfCount} Bins
                  </span>
                </td>

                {/* Status */}
                <td className="py-2.5 px-3">
                  <StatusBadge variant={loc.is_active ? 'active' : 'inactive'} dot>
                    {loc.is_active ? 'Active' : 'Offline'}
                  </StatusBadge>
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right">
                  <Link
                    href={`/locations/${loc.id}/shelves`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs bg-chrome-800 hover:bg-chrome-750 text-zinc-200 border border-chrome-700 transition-colors font-semibold"
                  >
                    <span>Manage Shelves</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}

            {locations.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-zinc-500">
                  No locations configured. Click &quot;Add Location&quot; to establish an operational node.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Location Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Establish Operational Location Node"
        description="Creates an authoritative mother warehouse, physical boutique, or returns hub with automatic WMS zone generation."
        width="max-w-xl"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Location Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. BLR-WH01 or BOM-ST02"
                required
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                Node Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-400 focus:outline-none"
              >
                <option value="warehouse">Mother Warehouse</option>
                <option value="boutique">Physical Boutique</option>
                <option value="quarantine">Quarantine & Returns Center</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Node Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Central Fulfilment Hub or Indiranagar Flagship"
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Physical Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Feet Rd, HAL 2nd Stage"
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Karnataka"
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
                PIN Code
              </label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="560038"
                className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              GSTIN (Tax Registration)
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 29AAAAA0000A1Z5"
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-400 focus:outline-none uppercase tabular-nums"
            />
          </div>

          {/* Default zones notification */}
          <div className="p-2.5 bg-chrome-950 border border-chrome-800 text-3xs text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-300 block">Automated Zone Provisioning:</span>
            <p>
              Saving this location will automatically generate standard WMS zones:
              <span className="text-zinc-200"> RCV (Receiving)</span>,
              <span className="text-zinc-200"> BLK (Bulk Storage)</span>,
              <span className="text-zinc-200"> FLR (Sales Floor)</span>,
              <span className="text-zinc-200"> QRN (Quarantine)</span>, and
              <span className="text-zinc-200"> DSK (Dispatch)</span>.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="terminal"
              size="sm"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSubmitting}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none"
            >
              Provision Node
            </Button>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  )
}
