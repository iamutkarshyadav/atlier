'use client'

import React from 'react'
import {
  Store,
  RotateCcw,
  Banknote,
  Keyboard,
  Barcode,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { type StoreLocation } from '@repo/supabase/utils'

interface PosHeaderProps {
  locations: StoreLocation[]
  activeLocation: StoreLocation | 'ALL'
  activeLocationCode: string
  setActiveLocation: (loc: StoreLocation | 'ALL') => void
  terminalId: string
  cashierName: string
  openingFloat: number
  scannerActive: boolean
  lastScannedBarcode: string | null
  borisMode: boolean
  onToggleBoris: () => void
  onOpenShiftModal: () => void
  onOpenShortcutsModal: () => void
}

export function PosHeader({
  locations,
  activeLocation,
  activeLocationCode,
  setActiveLocation,
  terminalId,
  cashierName,
  openingFloat,
  scannerActive,
  lastScannedBarcode,
  borisMode,
  onToggleBoris,
  onOpenShiftModal,
  onOpenShortcutsModal,
}: PosHeaderProps) {
  return (
    <header className="h-13 bg-chrome-900/90 backdrop-blur-md border border-chrome-800 px-4 flex items-center justify-between text-xs transition-all">
      {/* Left: Terminal & Boutique Location Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-emerald-400 shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 tracking-tight text-xs">
                Atelier POS Register
              </span>
              <span className="px-1.5 py-0.2 text-3xs font-mono font-bold tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700 rounded">
                {terminalId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-3xs text-zinc-400">
              <span>Boutique:</span>
              <select
                value={activeLocation === 'ALL' ? 'ALL' : activeLocation.id}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'ALL') {
                    setActiveLocation('ALL')
                  } else {
                    const found = locations.find((l) => l.id === val)
                    if (found) setActiveLocation(found)
                  }
                }}
                className="bg-transparent text-zinc-200 font-semibold focus:outline-none cursor-pointer border-b border-dashed border-zinc-700 hover:border-zinc-500 pb-0.5"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} className="bg-chrome-950 text-zinc-200">
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-3 border-l border-chrome-800 pl-3 text-3xs text-zinc-400">
          <span>Operator: <strong className="text-zinc-200">{cashierName}</strong></span>
          <span className="text-zinc-600">&bull;</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">Shift Active</span>
          </span>
        </div>
      </div>

      {/* Middle: Hardware Barcode Scanner Status */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-chrome-950 border border-chrome-800 rounded text-3xs font-mono">
        <Barcode className={`w-3.5 h-3.5 ${scannerActive ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
        <span className="text-zinc-400">Hardware Scanner:</span>
        {scannerActive ? (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            READY {lastScannedBarcode && `[${lastScannedBarcode}]`}
          </span>
        ) : (
          <span className="text-zinc-400 font-medium">Listening...</span>
        )}
      </div>

      {/* Right: Actions (Drawer Float, BORIS Return, Shortcuts) */}
      <div className="flex items-center gap-2">
        {/* Cash Drawer Float Button */}
        <button
          type="button"
          onClick={onOpenShiftModal}
          className="px-2.5 py-1.5 bg-chrome-950 hover:bg-zinc-800/60 border border-chrome-800 text-zinc-300 hover:text-white rounded text-2xs font-mono flex items-center gap-1.5 transition-colors"
          title="Open Cash Drawer & Shift Reconciliation"
        >
          <Banknote className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline text-zinc-400">Float:</span>
          <span className="font-bold tabular-nums text-zinc-100">${openingFloat.toFixed(2)}</span>
        </button>

        {/* BORIS Mode Switcher */}
        <button
          type="button"
          onClick={onToggleBoris}
          className={`px-3 py-1.5 text-2xs font-semibold rounded border flex items-center gap-1.5 transition-all ${
            borisMode
              ? 'bg-rose-950/80 text-rose-200 border-rose-700 shadow-sm'
              : 'bg-chrome-950 hover:bg-zinc-800/60 text-zinc-300 border-chrome-800 hover:text-white'
          }`}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${borisMode ? 'text-rose-400' : 'text-zinc-400'}`} />
          <span>{borisMode ? 'Exit Returns' : 'BORIS Returns'}</span>
        </button>

        {/* Keyboard Shortcuts Helper */}
        <button
          type="button"
          onClick={onOpenShortcutsModal}
          className="p-1.5 bg-chrome-950 hover:bg-zinc-800/60 border border-chrome-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
          title="POS Hotkeys (Press ?)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}

