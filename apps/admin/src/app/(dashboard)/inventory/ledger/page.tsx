'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText,
  RefreshCw,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  History,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getInventoryLedger,
  getLocations,
  type InventoryLedgerEntry,
  type StoreLocation,
} from '@repo/supabase/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function InventoryLedgerPage() {
  const [ledgerEntries, setLedgerEntries] = useState<InventoryLedgerEntry[]>([])
  const [locations, setLocations] = useState<StoreLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all')

  const loadLedger = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [entries, locs] = await Promise.all([
        getInventoryLedger(supabase, { limit: 200 }),
        getLocations(supabase),
      ])
      setLedgerEntries(entries)
      setLocations(locs)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLedger()
  }, [])

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (movementTypeFilter !== 'all' && entry.movement_type !== movementTypeFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesRef = (entry.reference_doc_id || '').toLowerCase().includes(q)
        const matchesType = entry.movement_type.toLowerCase().includes(q)
        const matchesNotes = (entry.notes || '').toLowerCase().includes(q)
        return matchesRef || matchesType || matchesNotes
      }
      return true
    })
  }, [ledgerEntries, movementTypeFilter, searchQuery])

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Immutable Inventory Audit Ledger</span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Append-only double-entry transaction journal capturing every shelf movement, GRN, sale, and return
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadLedger}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 bg-chrome-900 border border-chrome-800 text-xs">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Reference #, Movement Type, Notes..."
            className="w-full bg-chrome-950 border border-chrome-800 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-2xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All Movement Types</option>
            <option value="inbound_grn">Inbound Goods Receipt (GRN)</option>
            <option value="pos_sale">Boutique POS Sale</option>
            <option value="online_fulfillment">Online Dispatch / Pick</option>
            <option value="transfer_out">Stock Transfer (Out)</option>
            <option value="transfer_in">Stock Transfer (In)</option>
            <option value="cycle_count_adjustment">Cycle Count Adjustment</option>
            <option value="boris_return">In-Store Return (BORIS)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="py-2.5 px-3 font-semibold">Timestamp</th>
              <th className="py-2.5 px-3 font-semibold">Movement Type</th>
              <th className="py-2.5 px-3 font-semibold">Location</th>
              <th className="py-2.5 px-3 font-semibold text-center">Delta (&Delta; Qty)</th>
              <th className="py-2.5 px-3 font-semibold text-center">Balance After</th>
              <th className="py-2.5 px-3 font-semibold">Document Reference</th>
              <th className="py-2.5 px-3 font-semibold">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y border-chrome-800">
            {filteredEntries.map((entry) => {
              const loc = locations.find((l) => l.id === entry.location_id)
              const isPositive = entry.quantity > 0

              return (
                <tr key={entry.id} className="hover:bg-chrome-850 transition-colors">
                  {/* Timestamp */}
                  <td className="py-2 px-3 font-mono text-2xs text-zinc-400 tabular-nums">
                    {entry.transaction_timestamp
                      ? new Date(entry.transaction_timestamp).toLocaleString([], {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Recently'}
                  </td>

                  {/* Movement Type */}
                  <td className="py-2 px-3">
                    <StatusBadge variant={entry.movement_type} dot>
                      {entry.movement_type.replace(/_/g, ' ')}
                    </StatusBadge>
                  </td>

                  {/* Location */}
                  <td className="py-2 px-3 font-mono text-2xs text-zinc-300">
                    <span className="font-semibold text-zinc-100">{loc?.code || 'BLR-WH01'}</span>
                  </td>

                  {/* Quantity */}
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold tabular-nums text-xs px-2 py-0.5 border ${
                        isPositive
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                          : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                      }`}
                    >
                      {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      <span>{isPositive ? `+${entry.quantity}` : entry.quantity}</span>
                    </span>
                  </td>

                  {/* Balance After */}
                  <td className="py-2 px-3 text-center font-bold text-zinc-200 tabular-nums">
                    {entry.balance_after !== null && entry.balance_after !== undefined
                      ? entry.balance_after
                      : '—'}
                  </td>

                  {/* Document Reference */}
                  <td className="py-2 px-3 font-mono text-2xs text-zinc-300">
                    <span className="bg-chrome-800 px-1.5 py-0.5 border border-chrome-750">
                      {entry.reference_doc_id || 'MIG-INIT-20261108'}
                    </span>
                  </td>

                  {/* Audit Notes */}
                  <td className="py-2 px-3 text-2xs text-zinc-400 max-w-xs truncate">
                    {entry.notes || 'Automated ledger balance synchronization'}
                  </td>
                </tr>
              )
            })}

            {filteredEntries.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                  No audit ledger transactions recorded matching filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
