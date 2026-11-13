'use client'

import React, { useState } from 'react'
import {
  CreditCard,
  QrCode,
  Banknote,
  Layers,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Sparkles,
} from 'lucide-react'
import { type PaymentMethod } from './PosTypes'

interface PosSettlementProps {
  subtotal: number
  discountAmount: number
  cgst: number
  sgst: number
  grandTotal: number
  paymentMode: PaymentMethod
  onChangePaymentMode: (mode: PaymentMethod) => void
  cashTendered: string
  onChangeCashTendered: (val: string) => void
  changeDue: number
  cardAuthRef: string
  onChangeCardAuthRef: (val: string) => void
  upiRefNumber: string
  onChangeUpiRefNumber: (val: string) => void
  isCheckingOut: boolean
  checkoutError: string | null
  onCheckout: () => void
  hasItems: boolean
}

export function PosSettlement({
  subtotal,
  discountAmount,
  cgst,
  sgst,
  grandTotal,
  paymentMode,
  onChangePaymentMode,
  cashTendered,
  onChangeCashTendered,
  changeDue,
  cardAuthRef,
  onChangeCardAuthRef,
  upiRefNumber,
  onChangeUpiRefNumber,
  isCheckingOut,
  checkoutError,
  onCheckout,
  hasItems,
}: PosSettlementProps) {
  // Split tender state
  const [splitMethod1, setSplitMethod1] = useState<'cash' | 'card'>('cash')
  const [splitAmount1, setSplitAmount1] = useState<string>('')
  const [splitMethod2, setSplitMethod2] = useState<'card' | 'upi'>('upi')

  const splitVal1 = parseFloat(splitAmount1) || 0
  const splitBalance2 = Math.max(0, grandTotal - splitVal1)

  const handleQuickCashPreset = (amount: number) => {
    onChangeCashTendered(amount.toFixed(2))
  }

  const handleSimulateUpiPayment = () => {
    const randomUtr = `UPI-${Date.now().toString().slice(-8)}`
    onChangeUpiRefNumber(randomUtr)
  }

  return (
    <div className="bg-chrome-900 border border-chrome-800 rounded-lg p-3.5 space-y-3.5 select-none font-sans">
      {/* 1. Financial Breakdown */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-zinc-400">
          <span>Subtotal:</span>
          <span className="font-mono tabular-nums text-zinc-200">${subtotal.toFixed(2)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Discounts Applied:</span>
            <span className="font-mono tabular-nums">-${discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-zinc-400">
          <span>CGST (6%) + SGST (6%):</span>
          <span className="font-mono tabular-nums text-zinc-200">
            ${(cgst + sgst).toFixed(2)}
          </span>
        </div>

        <div className="pt-2 border-t border-chrome-800 flex justify-between items-baseline">
          <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">
            Total Payable:
          </span>
          <span className="font-mono font-bold text-lg text-emerald-400 tabular-nums">
            ${grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 2. Payment Tender Selector */}
      <div className="space-y-2 pt-1 border-t border-chrome-800">
        <span className="text-3xs uppercase tracking-wider font-semibold text-zinc-500 block">
          Select Tender Settlement Mode
        </span>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => onChangePaymentMode('upi')}
            className={`py-2 px-1 rounded border font-medium text-2xs flex flex-col items-center gap-1 transition-all ${
              paymentMode === 'upi'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-chrome-950 hover:bg-zinc-800 border-chrome-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>UPI QR</span>
          </button>

          <button
            type="button"
            onClick={() => onChangePaymentMode('card')}
            className={`py-2 px-1 rounded border font-medium text-2xs flex flex-col items-center gap-1 transition-all ${
              paymentMode === 'card'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-chrome-950 hover:bg-zinc-800 border-chrome-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Card EDC</span>
          </button>

          <button
            type="button"
            onClick={() => onChangePaymentMode('cash')}
            className={`py-2 px-1 rounded border font-medium text-2xs flex flex-col items-center gap-1 transition-all ${
              paymentMode === 'cash'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-chrome-950 hover:bg-zinc-800 border-chrome-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Cash</span>
          </button>

          <button
            type="button"
            onClick={() => onChangePaymentMode('split')}
            className={`py-2 px-1 rounded border font-medium text-2xs flex flex-col items-center gap-1 transition-all ${
              paymentMode === 'split'
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-chrome-950 hover:bg-zinc-800 border-chrome-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Split</span>
          </button>
        </div>
      </div>

      {/* 3. Tender-Specific Settlement Controls */}
      <div className="p-3 bg-chrome-950 border border-chrome-800 rounded space-y-2 text-xs font-mono">
        {/* UPI QR Mode */}
        {paymentMode === 'upi' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-2xs">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Dynamic UPI Terminal Intent
              </span>
              <span className="text-3xs text-emerald-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Ready for Scan
              </span>
            </div>

            <div className="flex items-center gap-3 bg-chrome-900 border border-chrome-800 rounded p-2.5">
              {/* Mock QR visual graphic */}
              <div className="w-16 h-16 bg-white p-1 rounded shrink-0 flex items-center justify-center">
                <QrCode className="w-14 h-14 text-black stroke-[1.5]" />
              </div>

              <div className="space-y-1 min-w-0">
                <span className="text-3xs text-zinc-500 block">VPA Intent:</span>
                <p className="text-2xs text-zinc-300 font-mono truncate">
                  upi://pay?pa=atelier@icici&am={grandTotal.toFixed(2)}
                </p>
                <button
                  type="button"
                  onClick={handleSimulateUpiPayment}
                  className="px-2 py-0.5 text-3xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded hover:bg-emerald-900 transition-colors"
                >
                  ⚡ Auto-Approve Mock UPI (UTR)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-3xs uppercase text-zinc-400 block font-sans font-semibold">
                UTR / Razorpay Reference #
              </label>
              <input
                type="text"
                value={upiRefNumber}
                onChange={(e) => onChangeUpiRefNumber(e.target.value)}
                placeholder="e.g. UPI-20261108-9982"
                className="w-full bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* Card EDC Mode */}
        {paymentMode === 'card' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Pax / Verifone Terminal
              </span>
              <span className="text-3xs text-zinc-400">Card EDC Terminal #01</span>
            </div>

            <div className="flex items-center gap-2 text-3xs text-zinc-400 pt-0.5">
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded font-semibold text-zinc-300">VISA</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded font-semibold text-zinc-300">MASTERCARD</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded font-semibold text-zinc-300">AMEX</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded font-semibold text-zinc-300">RUPAY</span>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-3xs uppercase text-zinc-400 block font-sans font-semibold">
                EDC Approval / Authorization Reference #
              </label>
              <input
                type="text"
                value={cardAuthRef}
                onChange={(e) => onChangeCardAuthRef(e.target.value.toUpperCase())}
                placeholder="e.g. AUTH-849201"
                className="w-full bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono uppercase"
              />
            </div>
          </div>
        )}

        {/* Cash Tender Mode */}
        {paymentMode === 'cash' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-amber-400" /> Cash Tender Calculator
              </span>
              <span className="text-3xs text-zinc-400">Counter Cash Drawer</span>
            </div>

            {/* Quick Tender Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickCashPreset(grandTotal)}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-3xs font-bold transition-colors"
              >
                Exact (${grandTotal.toFixed(2)})
              </button>
              {[100, 200, 500, 1000, 2000].map((amt) => {
                if (amt < grandTotal * 0.7 && amt < 500) return null
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCashPreset(amt)}
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded text-3xs font-bold transition-colors"
                  >
                    ${amt}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-3xs uppercase text-zinc-400 block font-sans font-semibold mb-0.5">
                  Cash Tendered ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={cashTendered}
                  onChange={(e) => onChangeCashTendered(e.target.value)}
                  placeholder={grandTotal.toFixed(2)}
                  className="w-full bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1.5 text-sm text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-3xs uppercase text-zinc-400 block font-sans font-semibold mb-0.5">
                  Change Due ($)
                </label>
                <div className="w-full bg-chrome-900 border border-chrome-800 rounded px-2.5 py-1.5 text-sm font-mono font-bold text-emerald-400 tabular-nums">
                  ${changeDue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Split Tender Mode */}
        {paymentMode === 'split' && (
          <div className="space-y-2">
            <span className="font-semibold text-zinc-200 text-2xs block">
              Split Transaction Across Multiple Tenders
            </span>

            <div className="grid grid-cols-2 gap-2 text-2xs">
              <div className="space-y-1">
                <label className="text-3xs text-zinc-400 block">Tender 1 ({splitMethod1.toUpperCase()})</label>
                <input
                  type="number"
                  step="any"
                  value={splitAmount1}
                  onChange={(e) => setSplitAmount1(e.target.value)}
                  placeholder={(grandTotal / 2).toFixed(2)}
                  className="w-full bg-chrome-900 border border-chrome-800 rounded px-2 py-1 text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs text-zinc-400 block">Tender 2 ({splitMethod2.toUpperCase()})</label>
                <div className="w-full bg-chrome-900 border border-chrome-800 rounded px-2 py-1 text-emerald-400 font-mono font-bold">
                  ${splitBalance2.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner if checkout throws */}
      {checkoutError && (
        <div className="p-2.5 bg-rose-950/70 border border-rose-800/80 rounded text-rose-300 text-2xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* 4. Checkout Settle & Print CTA Button */}
      <button
        type="button"
        onClick={onCheckout}
        disabled={isCheckingOut || !hasItems}
        className={`w-full h-12 rounded font-sans font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
          hasItems && !isCheckingOut
            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 active:scale-[0.99] cursor-pointer'
            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
        }`}
      >
        {isCheckingOut ? (
          <>
            <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            <span>Settling Atomic Transaction...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Settle Transaction & Print Receipt</span>
            <span className="hidden sm:inline text-3xs font-mono font-normal opacity-70 ml-1">
              [⌘ + Enter]
            </span>
          </>
        )}
      </button>
    </div>
  )
}

