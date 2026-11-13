'use client'

import React, { useState } from 'react'
import {
  Banknote,
  Printer,
  X,
  CreditCard,
  QrCode,
  CheckCircle2,
  Lock,
} from 'lucide-react'

interface PosShiftModalProps {
  isOpen: boolean
  onClose: () => void
  terminalId: string
  cashierName: string
  openingFloat: number
  cashSales: number
  cardSales: number
  upiSales: number
  onCloseShift?: (cashDrop: number) => void
}

export function PosShiftModal({
  isOpen,
  onClose,
  terminalId,
  cashierName,
  openingFloat,
  cashSales,
  cardSales,
  upiSales,
  onCloseShift,
}: PosShiftModalProps) {
  const [cashDrop, setCashDrop] = useState<string>('')
  const [isClosed, setIsClosed] = useState(false)

  if (!isOpen) return null

  const totalSales = cashSales + cardSales + upiSales
  const expectedCashInDrawer = openingFloat + cashSales - (parseFloat(cashDrop) || 0)

  const handleExecuteCloseShift = () => {
    setIsClosed(true)
    if (onCloseShift) {
      onCloseShift(parseFloat(cashDrop) || 0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-chrome-900 border border-chrome-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl font-sans text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-chrome-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Shift & Cash Drawer Reconciliation
              </h3>
              <p className="text-3xs text-zinc-400">
                Register {terminalId} &bull; Operator: {cashierName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isClosed ? (
          <div className="p-4 bg-emerald-950/50 border border-emerald-800/80 rounded space-y-2 text-center text-emerald-300">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Shift Reconciled & Closed Successfully
            </h4>
            <p className="text-3xs text-zinc-400 font-mono">
              Z-Report generated & cash deposit logged. Drawer safe to lock.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-1.5 bg-emerald-500 text-zinc-950 font-bold rounded text-xs hover:bg-emerald-400"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Sales Breakdown by Tender */}
            <div className="p-3 bg-chrome-950 border border-chrome-800 rounded space-y-2 font-mono text-xs">
              <div className="flex justify-between text-zinc-400 text-2xs font-sans font-semibold border-b border-chrome-800/80 pb-1">
                <span>Tender Mode</span>
                <span>Collected Amount</span>
              </div>

              <div className="flex justify-between items-center text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-amber-400" /> Cash Tender
                </span>
                <span className="tabular-nums font-bold">${cashSales.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Card EDC
                </span>
                <span className="tabular-nums font-bold">${cardSales.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" /> UPI QR
                </span>
                <span className="tabular-nums font-bold">${upiSales.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-chrome-800 flex justify-between items-center font-bold text-zinc-100">
                <span className="font-sans text-xs">Total Net Shift Sales:</span>
                <span className="text-emerald-400 text-sm tabular-nums">${totalSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Cash Drawer Reconciliation */}
            <div className="p-3 bg-chrome-950 border border-chrome-800 rounded space-y-2 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Opening Cash Float:</span>
                <span className="tabular-nums">${openingFloat.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Plus Cash Sales:</span>
                <span className="tabular-nums text-emerald-400">+${cashSales.toFixed(2)}</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-chrome-800/80">
                <label className="text-3xs uppercase font-semibold text-zinc-400 block font-sans">
                  Mid-Day Cash Drop to Safe ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={cashDrop}
                  onChange={(e) => setCashDrop(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-chrome-800 flex justify-between items-center font-bold text-zinc-100">
                <span className="font-sans text-xs">Expected Cash In Drawer:</span>
                <span className="text-amber-400 text-sm tabular-nums">
                  ${expectedCashInDrawer.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-chrome-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded text-2xs font-semibold bg-chrome-950 hover:bg-zinc-800 text-zinc-300 border border-chrome-800 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print X-Report</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteCloseShift}
                className="px-4 py-2 rounded text-2xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Shift (Z-Report)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

