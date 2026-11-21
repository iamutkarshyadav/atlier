'use client'

import React, { useState, useEffect } from 'react'
import {
  Zap,
  MapPin,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Badge,
} from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getBoltPincodes,
  createBoltPincode,
  updateBoltPincode,
  deleteBoltPincode,
  getBoltTimeslots,
  createBoltTimeslot,
  updateBoltTimeslot,
  deleteBoltTimeslot,
  getLocations,
  type BoltPincode,
  type BoltTimeslot,
  type StoreLocation,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export default function BoltControlCenterPage() {
  const [activeTab, setActiveTab] = useState<'pincodes' | 'timeslots'>('pincodes')
  const [pincodes, setPincodes] = useState<Array<BoltPincode & { location?: StoreLocation }>>([])
  const [timeslots, setTimeslots] = useState<BoltTimeslot[]>([])
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // PIN Form State
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [pinCity, setPinCity] = useState('Bengaluru')
  const [pinState, setPinState] = useState('Karnataka')
  const [pinHubId, setPinHubId] = useState('')
  const [pinMaxOrders, setPinMaxOrders] = useState('50')

  // Timeslot Form State
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [slotLabel, setSlotLabel] = useState('')
  const [slotStart, setSlotStart] = useState('10:00:00')
  const [slotEnd, setSlotEnd] = useState('12:00:00')
  const [slotCutoff, setSlotCutoff] = useState('09:00:00')
  const [slotCapacity, setSlotCapacity] = useState('15')

  const loadAll = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [pins, slots, locs] = await Promise.all([
        getBoltPincodes(supabase),
        getBoltTimeslots(supabase),
        getLocations(supabase),
      ])
      setPincodes(pins)
      setTimeslots(slots)
      setLocations(locs)
      if (locs.length > 0 && !pinHubId) {
        setPinHubId(locs[0]!.id)
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load Bolt configuration' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Pincode Handlers
  const handleCreatePincode = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPin = pinCode.trim()
    if (!/^\d{6}$/.test(cleanPin)) {
      setFeedback({ type: 'error', message: 'PIN code must be exactly 6 numeric digits (e.g. 560001)' })
      return
    }

    const supabase = createBrowserClient()
    const { data, error } = await createBoltPincode(supabase, {
      pincode: cleanPin,
      city: pinCity.trim(),
      state: pinState.trim(),
      hub_location_id: pinHubId || null,
      max_daily_orders: parseInt(pinMaxOrders, 10) || 50,
      is_active: true,
    })

    if (error) {
      setFeedback({ type: 'error', message: error })
    } else {
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: `PIN code ${cleanPin} provisioned for Bolt Try-On!` })
      setPinCode('')
      setIsAddingPin(false)
      loadAll()
    }
  }

  const handleTogglePincode = async (pin: BoltPincode) => {
    const nextState = !pin.is_active
    setPincodes((prev) => prev.map((p) => (p.id === pin.id ? { ...p, is_active: nextState } : p)))

    const supabase = createBrowserClient()
    const { success, error } = await updateBoltPincode(supabase, pin.id, { is_active: nextState })
    if (!success) {
      setFeedback({ type: 'error', message: error || 'Failed to toggle pincode' })
    } else {
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({
        type: 'success',
        message: `PIN ${pin.pincode} ${nextState ? 'activated' : 'paused'}. Storefront live check updated.`,
      })
    }
  }

  const handleDeletePincode = async (id: string, code: string) => {
    if (!confirm(`Remove PIN code ${code} from Bolt serviceability?`)) return

    const supabase = createBrowserClient()
    const { success, error } = await deleteBoltPincode(supabase, id)
    if (!success) {
      setFeedback({ type: 'error', message: error || 'Failed to delete pincode' })
    } else {
      await triggerStorefrontRevalidation({ path: '/' })
      setPincodes((prev) => prev.filter((p) => p.id !== id))
      setFeedback({ type: 'success', message: `PIN ${code} deleted.` })
    }
  }

  // Timeslot Handlers
  const handleCreateTimeslot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slotLabel.trim()) return

    const supabase = createBrowserClient()
    const { data, error } = await createBoltTimeslot(supabase, {
      label: slotLabel.trim(),
      slot_start: slotStart,
      slot_end: slotEnd,
      cutoff_time: slotCutoff,
      max_daily_capacity: parseInt(slotCapacity, 10) || 15,
      is_active: true,
    })

    if (error) {
      setFeedback({ type: 'error', message: error })
    } else {
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({ type: 'success', message: `Timeslot "${slotLabel}" activated on checkout!` })
      setSlotLabel('')
      setIsAddingSlot(false)
      loadAll()
    }
  }

  const handleToggleTimeslot = async (slot: BoltTimeslot) => {
    const nextState = !slot.is_active
    setTimeslots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, is_active: nextState } : s)))

    const supabase = createBrowserClient()
    const { success, error } = await updateBoltTimeslot(supabase, slot.id, { is_active: nextState })
    if (!success) {
      setFeedback({ type: 'error', message: error || 'Failed to toggle timeslot' })
    } else {
      await triggerStorefrontRevalidation({ path: '/' })
      setFeedback({
        type: 'success',
        message: `Timeslot "${slot.label}" ${nextState ? 'enabled' : 'paused'} for customer checkout.`,
      })
    }
  }

  const handleDeleteTimeslot = async (id: string, label: string) => {
    if (!confirm(`Delete timeslot "${label}"?`)) return

    const supabase = createBrowserClient()
    const { success, error } = await deleteBoltTimeslot(supabase, id)
    if (!success) {
      setFeedback({ type: 'error', message: error || 'Failed to delete timeslot' })
    } else {
      await triggerStorefrontRevalidation({ path: '/' })
      setTimeslots((prev) => prev.filter((s) => s.id !== id))
      setFeedback({ type: 'success', message: `Timeslot "${label}" deleted.` })
    }
  }

  const activePinsCount = pincodes.filter((p) => p.is_active).length
  const activeSlotsCount = timeslots.filter((s) => s.is_active).length

  return (
    <div className="space-y-6 font-mono pb-20">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-chrome-800 pb-5">
        <div>
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold block">
            Hyper-Local Try-On Fulfillment & Scheduling
          </span>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2 mt-0.5">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Bolt 45-Min Doorstep Try-On Engine</span>
          </h1>
          <p className="text-2xs text-zinc-400 mt-1">
            Governs live postal codes, dark store dispatch hubs, and reserved fitting appointment timeslots across Storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadAll}
            isLoading={isLoading}
            className="flex items-center gap-1.5 h-8 px-3 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </Button>

          <Badge variant="outline" className="text-2xs bg-amber-950/40 text-amber-400 border-amber-800/60 font-mono py-1">
            {activePinsCount} Active PINs • {activeSlotsCount} Live Slots
          </Badge>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 text-xs flex justify-between items-center shadow-lg border ${
            feedback.type === 'success'
              ? 'bg-chrome-850 border-emerald-500 text-emerald-300'
              : 'bg-chrome-850 border-rose-500 text-rose-300'
          }`}
        >
          <span className="font-semibold">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* 2 Main Operation Tabs */}
      <div className="flex border-b border-chrome-800 bg-chrome-950">
        <button
          onClick={() => setActiveTab('pincodes')}
          className={`flex items-center gap-2 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'pincodes'
              ? 'border-amber-400 text-amber-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>1. Serviceable PIN Codes ({pincodes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeslots')}
          className={`flex items-center gap-2 px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'timeslots'
              ? 'border-amber-400 text-amber-400 bg-chrome-900'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>2. Fitting Timeslots ({timeslots.length})</span>
        </button>
      </div>

      {/* TAB 1: PINCODES */}
      {activeTab === 'pincodes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">
              Only addresses inside active PINs can select Bolt Try-On during storefront checkout.
            </span>
            <Button
              size="sm"
              onClick={() => setIsAddingPin((prev) => !prev)}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-none flex items-center gap-1.5 text-2xs h-8 px-3"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingPin ? 'Cancel' : 'Add Serviceable PIN'}</span>
            </Button>
          </div>

          {/* Add Pincode Form */}
          {isAddingPin && (
            <div className="p-5 bg-chrome-900 border border-amber-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Provision New Serviceable PIN Code
              </h3>
              <form onSubmit={handleCreatePincode} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    6-Digit PIN Code *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 560001"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={pinCity}
                    onChange={(e) => setPinCity(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    Fulfillment Hub / Dark Store
                  </label>
                  <select
                    value={pinHubId}
                    onChange={(e) => setPinHubId(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">-- Auto-Route (Nearest Hub) --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    Daily Booking Cap
                  </label>
                  <input
                    type="number"
                    value={pinMaxOrders}
                    onChange={(e) => setPinMaxOrders(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-chrome-800">
                  <Button type="button" variant="terminal" size="sm" onClick={() => setIsAddingPin(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none">
                    Publish Serviceable PIN
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Pincodes Table */}
          <div className="border border-chrome-800 bg-chrome-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-chrome-800 bg-chrome-950">
                  <TableHead className="w-12 text-zinc-400 font-semibold">Seq</TableHead>
                  <TableHead className="text-zinc-400 font-semibold">PIN Code</TableHead>
                  <TableHead className="text-zinc-400 font-semibold">City / State</TableHead>
                  <TableHead className="text-zinc-400 font-semibold">Fulfillment Node</TableHead>
                  <TableHead className="text-center text-zinc-400 font-semibold">Max Daily Limit</TableHead>
                  <TableHead className="text-center text-zinc-400 font-semibold">Status</TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pincodes.map((pin, idx) => (
                  <TableRow key={pin.id} className="border-b border-chrome-850 hover:bg-chrome-850 transition-colors">
                    <TableCell className="font-mono text-zinc-500 text-2xs">0{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-amber-400">
                      {pin.pincode}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-200">
                      {pin.city}, {pin.state}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {pin.location?.name ? (
                        <span className="flex items-center gap-1.5 text-zinc-200">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{pin.location.name}</span>
                          <span className="text-3xs text-zinc-500 font-mono">({pin.location.code})</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-2xs font-mono">Dynamic Dispatch</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-zinc-300">
                      {(pin as any).max_daily_orders || 50} / day
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-3xs ${
                          pin.is_active
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                            : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        {pin.is_active ? 'Serviceable' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePincode(pin)}
                          className={`px-2 py-0.5 text-3xs font-bold border transition-colors ${
                            pin.is_active
                              ? 'bg-chrome-800 hover:bg-rose-950/40 border-chrome-700 text-zinc-300 hover:text-rose-400'
                              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                          }`}
                        >
                          {pin.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePincode(pin.id, pin.pincode)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete PIN"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {pincodes.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                      No serviceable PIN codes registered. Click &quot;Add Serviceable PIN&quot; to open Bolt in your city.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 2: TIMESLOTS */}
      {activeTab === 'timeslots' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">
              Fitting appointments offered to patrons during checkout. Cutoff times prevent last-minute dispatch failures.
            </span>
            <Button
              size="sm"
              onClick={() => setIsAddingSlot((prev) => !prev)}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-none flex items-center gap-1.5 text-2xs h-8 px-3"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingSlot ? 'Cancel' : 'Add Timeslot'}</span>
            </Button>
          </div>

          {/* Add Slot Form */}
          {isAddingSlot && (
            <div className="p-5 bg-chrome-900 border border-amber-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Create Fitting Timeslot Window
              </h3>
              <form onSubmit={handleCreateTimeslot} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                <div className="lg:col-span-2">
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    Slot Label *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM - 12:00 PM (Morning Priority)"
                    value={slotLabel}
                    onChange={(e) => setSlotLabel(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                    Max Appointments
                  </label>
                  <input
                    type="number"
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(e.target.value)}
                    className="w-full h-9 bg-chrome-950 border border-chrome-800 px-3 text-zinc-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2 pt-2 border-t border-chrome-800">
                  <Button type="button" variant="terminal" size="sm" onClick={() => setIsAddingSlot(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none">
                    Publish Timeslot
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Timeslots Table */}
          <div className="border border-chrome-800 bg-chrome-900 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-chrome-800 bg-chrome-950">
                  <TableHead className="w-12 text-zinc-400 font-semibold">Seq</TableHead>
                  <TableHead className="text-zinc-400 font-semibold">Timeslot Label</TableHead>
                  <TableHead className="text-zinc-400 font-semibold">Window (Start – End)</TableHead>
                  <TableHead className="text-zinc-400 font-semibold">Cutoff Time</TableHead>
                  <TableHead className="text-center text-zinc-400 font-semibold">Capacity</TableHead>
                  <TableHead className="text-center text-zinc-400 font-semibold">Status</TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeslots.map((slot, idx) => (
                  <TableRow key={slot.id} className="border-b border-chrome-850 hover:bg-chrome-850 transition-colors">
                    <TableCell className="font-mono text-zinc-500 text-2xs">0{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-zinc-100 text-xs">{slot.label}</TableCell>
                    <TableCell className="font-mono text-xs text-amber-400">
                      {slot.slot_start || '00:00'} – {slot.slot_end || '23:59'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">{slot.cutoff_time}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-zinc-300">
                      {slot.max_daily_capacity} sessions
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-3xs ${
                          slot.is_active
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                            : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        {slot.is_active ? 'Live' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTimeslot(slot)}
                          className={`px-2 py-0.5 text-3xs font-bold border transition-colors ${
                            slot.is_active
                              ? 'bg-chrome-800 hover:bg-rose-950/40 border-chrome-700 text-zinc-300 hover:text-rose-400'
                              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                          }`}
                        >
                          {slot.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTimeslot(slot.id, slot.label)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete Timeslot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {timeslots.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                      No timeslots registered. Click &quot;Add Timeslot&quot; to establish booking windows.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
