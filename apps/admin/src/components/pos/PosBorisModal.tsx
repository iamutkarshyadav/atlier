'use client'

import React, { useState } from 'react'
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Scan,
  ShieldCheck,
  CreditCard,
  Warehouse,
} from 'lucide-react'
import { type QcStatus } from '@repo/supabase/utils'

interface PosBorisModalProps {
  isOpen: boolean
  onClose: () => void
  activeLocationCode: string
  floorShelfCoordinate: string
  onSubmitReturn: (
    orderNumber: string,
    qcCondition: QcStatus,
    refundMode: 'store_credit' | 'original_payment',
    notes: string
  ) => Promise<{ success: boolean; message: string }>
}

export function PosBorisModal({
  isOpen,
  onClose,
  activeLocationCode,
  floorShelfCoordinate,
  onSubmitReturn,
}: PosBorisModalProps) {
  const [orderNumber, setOrderNumber] = useState('')
  const [qcCondition, setQcCondition] = useState<QcStatus>('accepted')
  const [refundMode, setRefundMode] = useState<'store_credit' | 'original_payment'>('store_credit')
  const [notes, setNotes] = useState('In-store client return verified at boutique counter')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim()) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await onSubmitReturn(orderNumber.trim(), qcCondition, refundMode, notes)
      if (res.success) {
        setFeedback({ type: 'success', message: res.message })
        setTimeout(() => {
          setFeedback(null)
          setOrderNumber('')
          onClose()
        }, 1800)
      } else {
        setFeedback({ type: 'error', message: res.message })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Return processing error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-chrome-900 border border-chrome-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl font-sans text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-chrome-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                BORIS (Buy Online, Return In-Store) Engine
              </h3>
              <p className="text-3xs text-zinc-400">
                Process customer returns, inspect garment condition & restock shelf live
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

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded text-2xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border border-rose-800 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Return Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-3xs uppercase font-semibold text-zinc-400 block font-mono">
              Scan or Enter POS Invoice # or Online Order # *
            </label>
            <div className="relative">
              <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="e.g. POS-20261108-0042 or ORD-9812..."
                required
                className="w-full bg-chrome-950 border border-chrome-800 rounded pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* QC Inspection Condition */}
            <div className="space-y-1">
              <label className="text-3xs uppercase font-semibold text-zinc-400 block font-mono">
                QC Inspection Condition
              </label>
              <select
                value={qcCondition}
                onChange={(e) => setQcCondition(e.target.value as QcStatus)}
                className="w-full bg-chrome-950 border border-chrome-800 rounded px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="accepted">Pristine &bull; Restock to Sales Floor ({floorShelfCoordinate})</option>
                <option value="rejected_damaged">Damaged &bull; Quarantine Bin (QRN-A-01)</option>
              </select>
            </div>

            {/* Refund Tender Method */}
            <div className="space-y-1">
              <label className="text-3xs uppercase font-semibold text-zinc-400 block font-mono">
                Refund Tender Method
              </label>
              <select
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value as any)}
                className="w-full bg-chrome-950 border border-chrome-800 rounded px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="store_credit">Atelier Store Credit / Gift Card</option>
                <option value="original_payment">Original Payment (Card / UPI / Cash)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-3xs uppercase font-semibold text-zinc-400 block font-mono">
              Return Inspection Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-chrome-950 border border-chrome-800 rounded px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-chrome-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded text-2xs font-semibold bg-chrome-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-chrome-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !orderNumber.trim()}
              className="px-4 py-2 rounded text-2xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Processing Return...' : 'Execute BORIS Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

