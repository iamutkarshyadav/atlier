'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  Store,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getStockTransfers,
  getLocations,
  executeStockTransfer,
  type StockTransfer,
  type StoreLocation,
} from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // New Transfer Form State
  const [sourceLocationId, setSourceLocationId] = useState('')
  const [destLocationId, setDestLocationId] = useState('')
  const [ewayBill, setEwayBill] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [tList, locs] = await Promise.all([
        getStockTransfers(supabase),
        getLocations(supabase),
      ])
      setTransfers(tList)
      setLocations(locs)
      if (locs.length >= 2) {
        setSourceLocationId(locs[0]?.id || '')
        setDestLocationId(locs[1]?.id || '')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceLocationId || !destLocationId) {
      setFormError('Please select both source and destination locations.')
      return
    }
    if (sourceLocationId === destLocationId) {
      setFormError('Source and destination locations cannot be identical.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const supabase = createBrowserClient()
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const randSeq = Math.floor(1000 + Math.random() * 9000)
      const transferNumber = `TRF-${dateStr}-${randSeq}`

      const { error: trfErr } = await supabase
        .from('stock_transfers')
        .insert({
          transfer_number: transferNumber,
          source_location_id: sourceLocationId,
          destination_location_id: destLocationId,
          status: 'draft',
          eway_bill_number: ewayBill.trim() || null,
        })

      if (trfErr) throw trfErr

      setDrawerOpen(false)
      setEwayBill('')
      loadData()
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create stock transfer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDispatch = async (transferId: string) => {
    setActionLoadingId(transferId)
    try {
      const supabase = createBrowserClient()
      const res = await executeStockTransfer(supabase, {
        transferId,
        action: 'dispatch',
        notes: 'Dispatched via Admin Terminal',
      })
      if (!res.success) {
        alert(res.error || 'Dispatch failed')
      } else {
        loadData()
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReceive = async (transferId: string) => {
    setActionLoadingId(transferId)
    try {
      const supabase = createBrowserClient()
      const res = await executeStockTransfer(supabase, {
        transferId,
        action: 'receive',
        notes: 'Received and verified at destination boutique',
      })
      if (!res.success) {
        alert(res.error || 'Receive failed')
      } else {
        loadData()
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            <span>Inter-Store & Warehouse Stock Transfers</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Multi-store inventory balancing, dispatch state machine, and destination receiving verification
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
            onClick={() => setDrawerOpen(true)}
            className="h-7 px-3 text-2xs bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 rounded-none"
          >
            <Plus className="w-3.5 h-3.5" /> New Stock Transfer
          </Button>
        </div>
      </div>

      {/* Transfers Data Grid */}
      <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 font-semibold">Transfer #</th>
              <th className="py-2.5 px-3 font-semibold">Origin Node</th>
              <th className="py-2.5 px-3 font-semibold">Destination Node</th>
              <th className="py-2.5 px-3 font-semibold">Status</th>
              <th className="py-2.5 px-3 font-semibold">e-Way Bill #</th>
              <th className="py-2.5 px-3 font-semibold">Created Date</th>
              <th className="py-2.5 px-3 font-semibold text-right">State Machine Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome-800">
            {transfers.map((trf) => {
              const srcLoc = locations.find((l) => l.id === trf.source_location_id)
              const destLoc = locations.find((l) => l.id === trf.destination_location_id)
              const isActionLoading = actionLoadingId === trf.id

              return (
                <tr key={trf.id} className="hover:bg-chrome-850 transition-colors">
                  {/* Transfer # */}
                  <td className="py-2.5 px-3 font-bold text-zinc-100 tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{trf.transfer_number}</span>
                    </div>
                  </td>

                  {/* Origin */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-200">
                      <Warehouse className="w-3 h-3 text-zinc-400" />
                      <span className="font-semibold">{srcLoc?.code || 'BLR-WH01'}</span>
                    </div>
                    <span className="text-3xs text-zinc-500 truncate block max-w-[140px]">
                      {srcLoc?.name || 'Central Fulfilment'}
                    </span>
                  </td>

                  {/* Destination */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-200">
                      <Store className="w-3 h-3 text-emerald-400" />
                      <span className="font-semibold">{destLoc?.code || 'BLR-ST01'}</span>
                    </div>
                    <span className="text-3xs text-zinc-500 truncate block max-w-[140px]">
                      {destLoc?.name || 'Indiranagar Boutique'}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3">
                    <StatusBadge variant={trf.status} dot />
                  </td>

                  {/* e-Way Bill */}
                  <td className="py-2.5 px-3 text-2xs text-zinc-400 font-mono">
                    {trf.eway_bill_number || 'EWAY-NOT-REQUIRED'}
                  </td>

                  {/* Created Date */}
                  <td className="py-2.5 px-3 text-2xs text-zinc-400 tabular-nums">
                    {trf.created_at ? new Date(trf.created_at).toLocaleDateString() : 'Today'}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {trf.status === 'draft' && (
                        <button
                          onClick={() => handleDispatch(trf.id)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1 text-2xs bg-amber-950/40 text-amber-400 border border-amber-800/60 hover:bg-amber-900/40 transition-colors font-semibold"
                        >
                          {isActionLoading ? 'Dispatching...' : 'Dispatch'}
                        </button>
                      )}

                      {trf.status === 'in_transit' && (
                        <button
                          onClick={() => handleReceive(trf.id)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1 text-2xs bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/40 transition-colors font-semibold"
                        >
                          {isActionLoading ? 'Receiving...' : 'Receive & Restock'}
                        </button>
                      )}

                      {trf.status === 'received' && (
                        <span className="text-3xs text-zinc-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Fulfilled
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {transfers.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                  No stock transfers found. Click &quot;New Stock Transfer&quot; to initiate relocation between nodes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Stock Transfer Drawer */}
      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Initiate Inter-Store Stock Transfer"
        description="Creates a tracked inventory dispatch between warehouse hubs and physical boutiques."
        width="max-w-lg"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Origin Location (Source) *
            </label>
            <select
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name} ({l.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Destination Location (Target) *
            </label>
            <select
              value={destLocationId}
              onChange={(e) => setDestLocationId(e.target.value)}
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name} ({l.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              e-Way Bill Number (Optional)
            </label>
            <input
              type="text"
              value={ewayBill}
              onChange={(e) => setEwayBill(e.target.value)}
              placeholder="e.g. EWB-20261108-9842"
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 font-mono"
            />
          </div>

          <div className="p-3 bg-chrome-950 border border-chrome-800 text-3xs text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-300 block">Dispatch Lifecycle:</span>
            <p>
              1. Transfer starts in <span className="text-cyan-400 font-semibold">draft</span>.
              <br />
              2. Clicking <span className="text-amber-400 font-semibold">Dispatch</span> deducts units from source location shelves.
              <br />
              3. Clicking <span className="text-emerald-400 font-semibold">Receive</span> at destination boutique restocks inventory onto retail sales floor.
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
              Generate Transfer Manifest
            </Button>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  )
}
