'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Clock,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MapPin,
  Phone,
  Check,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react'

export interface TryOnItem {
  id: string
  title: string
  category: string
  edition: string
  size?: string
  price: number
  image: string
  isKept: boolean | null // null = undecided, true = kept, false = rejected
  rejectionReason?: string
}

export interface TryOnOrderData {
  id: string
  customerName: string
  customerPhone: string
  address: string
  scheduledSlot: string
  notes: string
  items: TryOnItem[]
}

interface ActiveTryOnEngineProps {
  orderData?: TryOnOrderData
  onFinalized?: (result: { orderId: string; finalTotal: number; keptCount: number }) => void
}

const DEFAULT_ORDER: TryOnOrderData = {
  id: 'ATL-ORD-9821',
  customerName: 'Aanya Sharma',
  customerPhone: '+91 98860 12345',
  address: 'No. 42, 12th Main Road, Indiranagar, Bengaluru, Karnataka 560038',
  scheduledSlot: 'Today • 15:00 – 15:45 (Doorstep Try-On)',
  notes: 'Ring doorbell on arrival or coordinate with apartment security.',
  items: [
    {
      id: 'item_1',
      title: 'Architectural Selvedge Linen Smock',
      category: 'Wearable Art',
      edition: 'Edition 05 of 15',
      size: 'Taille 02 (FR 40–42)',
      price: 18500.0,
      image: '/images/prod3-front.jpg',
      isKept: true,
    },
    {
      id: 'item_2',
      title: 'Sculptural Sandstone Vessel',
      category: 'Ceramics',
      edition: 'Edition 01 of 12',
      size: 'One Size',
      price: 14200.0,
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      isKept: false,
      rejectionReason: 'Size / Fit Mismatch',
    },
    {
      id: 'item_3',
      title: 'Carved Alabaster Pendant Cylinder',
      category: 'Lighting',
      edition: 'Edition 02 of 06',
      size: 'Standard',
      price: 26000.0,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
      isKept: true,
    },
  ],
}

const REJECTION_REASONS = [
  'Size / Fit Mismatch',
  'Materiality Preference',
  'Scale / Proportion',
  'Customer Declined Work',
]

export function ActiveTryOnEngine({
  orderData = DEFAULT_ORDER,
  onFinalized,
}: ActiveTryOnEngineProps) {
  const router = useRouter()

  // Lifecycle Phases: 'pending' -> 'active_timer' -> 'reconciling' -> 'completed'
  const [phase, setPhase] = useState<'pending' | 'active_timer' | 'reconciling' | 'completed'>(
    'pending'
  )

  // 45-Minute Timer Logic (45 minutes = 2700 seconds)
  const INITIAL_DURATION = 45 * 60
  const [timeLeft, setTimeLeft] = useState(INITIAL_DURATION)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [totalFittingDuration, setTotalFittingDuration] = useState(INITIAL_DURATION)

  // Payment mode collected at doorstep
  const [collectedPaymentMode, setCollectedPaymentMode] = useState<'upi' | 'cash' | 'card'>('upi')
  const [paymentRef, setPaymentRef] = useState('')

  // Reconciliation items checklist state
  const [items, setItems] = useState<TryOnItem[]>(orderData.items)
  const [courierNotes, setCourierNotes] = useState(
    'Customer inspected works in fitting session. Reconciled and repacked returned editions for warehouse dock inwarding.'
  )
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Timer interval countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (isTimerRunning && phase === 'active_timer') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer!)
            setIsTimerRunning(false)
            setPhase('reconciling')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isTimerRunning, phase])

  // Timer Controls
  const handleStartFitting = async () => {
    setPhase('active_timer')
    setIsTimerRunning(true)

    // Notify session status via secure server endpoint
    try {
      await fetch('/api/bolt/session-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          status: 'at_doorstep',
        }),
      })
    } catch (err) {
      console.warn('Could not sync fitting start time to server:', err)
    }
  }

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning)
  }

  const handleExtendFitting = (additionalMinutes = 15) => {
    const additionalSeconds = additionalMinutes * 60
    setTimeLeft((prev) => prev + additionalSeconds)
    setTotalFittingDuration((prev) => prev + additionalSeconds)
  }

  const handleProceedToReconciliation = () => {
    setIsTimerRunning(false)
    setPhase('reconciling')
  }

  // Reconciliation Toggle Actions
  const handleSetItemDecision = (itemId: string, isKept: boolean) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            isKept,
            rejectionReason: isKept ? undefined : item.rejectionReason || REJECTION_REASONS[0],
          }
        }
        return item
      })
    )
  }

  const handleSetRejectionReason = (itemId: string, reason: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, rejectionReason: reason } : item))
    )
  }

  // Financial Computations for Kept items (INR & Indian GST 6% CGST + 6% SGST)
  const keptItems = items.filter((i) => i.isKept === true)
  const rejectedItems = items.filter((i) => i.isKept === false)
  const keptSubtotal = keptItems.reduce((acc, curr) => acc + curr.price, 0)
  const initialManifestTotal = items.reduce((acc, curr) => acc + curr.price, 0)

  // GST 12% (6% CGST + 6% SGST included in MRP)
  const cgst = Number((keptSubtotal * 0.06).toFixed(2))
  const sgst = Number((keptSubtotal * 0.06).toFixed(2))
  const finalTotal = keptSubtotal

  // Server-Side Finalization Handler (Zero client-side direct table mutations)
  const handleFinalizeReconciliation = async () => {
    setIsFinalizing(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/bolt/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          decisions: items.map((item) => ({
            itemId: item.id,
            decision: item.isKept ? 'kept' : 'rejected',
            rejectionReason: item.isKept ? undefined : item.rejectionReason || 'Customer rejected during fitting',
          })),
          collectedPaymentMode,
          paymentRef: paymentRef.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reconcile try-on session')
      }

      // Eagerly trigger tax invoice generation in the background
      try {
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'
        fetch(`${adminUrl}/api/invoice/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.id }),
        }).catch(() => {})
      } catch {}

      setIsFinalizing(false)
      setPhase('completed')

      if (onFinalized) {
        onFinalized({
          orderId: orderData.id,
          finalTotal,
          keptCount: keptItems.length,
        })
      }
    } catch (err: any) {
      setIsFinalizing(false)
      setErrorMessage(err.message || 'Error communicating with server')
    }
  }

  // Format MM:SS for countdown timer
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = Math.max(0, Math.min(100, (timeLeft / totalFittingDuration) * 100))

  return (
    <div className="space-y-8 pb-16 max-w-2xl mx-auto font-sans text-neutral-100">
      {/* Navigation Top Header */}
      <div className="flex justify-between items-center border-b border-[#222222] pb-4">
        <Link
          href="/assigned-deliveries"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-caps text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Manifest
        </Link>
        <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1">
          OLED Courier Engine • Try-On Mode
        </span>
      </div>

      {/* Customer Dropoff Briefing Card */}
      <div className="p-5 bg-[#0D0D0D] border-2 border-[#222222] space-y-4 shadow-xl">
        <div className="flex justify-between items-start border-b border-[#1A1A1A] pb-3">
          <div>
            <span className="font-mono text-xs uppercase text-amber-400 font-bold tracking-caps">
              {orderData.id} • Fitting Session
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white mt-0.5">
              {orderData.customerName}
            </h1>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1">
            Doorstep Concierge
          </span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-start gap-2.5 text-neutral-300">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{orderData.address}</span>
          </div>

          <div className="flex items-center gap-2.5 text-neutral-400">
            <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>Scheduled Window: {orderData.scheduledSlot}</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <a
              href={`tel:${orderData.customerPhone}`}
              className="inline-flex items-center gap-2 h-9 px-3.5 bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs font-mono border border-[#333333] active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call Customer ({orderData.customerPhone})</span>
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PHASE 1: PENDING DOORSTEP ARRIVAL */}
      {/* ========================================================= */}
      {phase === 'pending' && (
        <div className="p-8 bg-[#111111] border-2 border-[#262626] text-center space-y-6">
          <div className="w-16 h-16 bg-[#1A1A1A] border-2 border-amber-400/50 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              Arrived at Customer Residence
            </h2>
            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
              Customer is present at doorstep. Tap below to initiate the synchronized 45-minute fitting countdown timer.
            </p>
          </div>

          {/* Item count preview */}
          <div className="p-3 bg-[#0A0A0A] border border-[#222222] font-mono text-xs text-neutral-300 flex justify-around">
            <span>Manifest: {items.length} Curated Works</span>
            <span>•</span>
            <span>Duration: 45 Minutes Max</span>
          </div>

          <button
            onClick={handleStartFitting}
            className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-sm font-extrabold uppercase tracking-luxury active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-2xl"
          >
            <Play className="w-5 h-5 fill-black" />
            <span>Start 45m Doorstep Fitting Window</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 2: ACTIVE 45-MINUTE COUNTDOWN TIMER (OLED DASHBOARD) */}
      {/* ========================================================= */}
      {phase === 'active_timer' && (
        <div className="p-8 bg-[#080808] border-2 border-[#2A2A2A] space-y-8 shadow-2xl">
          {/* Header Status Beacon */}
          <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono text-xs uppercase text-emerald-400 font-bold tracking-caps">
                Doorstep Fitting Active
              </span>
            </div>
            <span className="font-mono text-xs text-neutral-500 uppercase">
              {isTimerRunning ? 'Clock Running' : 'Timer Paused'}
            </span>
          </div>

          {/* High-Contrast OLED Giant Timer Ticker */}
          <div className="text-center space-y-4 py-4">
            <div className="inline-block relative">
              <div
                className={`font-mono text-6xl sm:text-7xl font-black tracking-widest tabular-nums ${
                  timeLeft <= 600 ? 'text-amber-400 animate-pulse' : 'text-white'
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500 block mt-1">
                Minutes Remaining In Doorstep Session
              </span>
            </div>

            {/* OLED Linear Progress Bar */}
            <div className="w-full h-3 bg-[#1A1A1A] border border-[#333333] overflow-hidden">
              <motion.div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 600 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Timer Controls Toolbar */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleToggleTimer}
              className={`h-12 border font-mono text-xs uppercase tracking-caps font-bold flex items-center justify-center gap-2 transition-all ${
                isTimerRunning
                  ? 'bg-[#1A1A1A] hover:bg-[#252525] border-[#444444] text-neutral-200'
                  : 'bg-amber-400 text-black border-amber-300'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-white" /> Pause Timer
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" /> Resume Timer
                </>
              )}
            </button>

            <button
              onClick={() => handleExtendFitting(15)}
              className="h-12 bg-[#1A1A1A] hover:bg-[#252525] border border-[#444444] font-mono text-xs uppercase tracking-caps text-neutral-200 font-bold flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" /> Extend +15 Mins
            </button>
          </div>

          {/* Reconcile Immediately Action */}
          <div className="pt-4 border-t border-[#1A1A1A] space-y-3">
            <p className="text-[11px] text-neutral-400 font-mono text-center">
              Customer concluded fitting? Proceed directly to item reconciliation.
            </p>
            <button
              onClick={handleProceedToReconciliation}
              className="w-full h-14 bg-white text-black hover:bg-neutral-200 font-mono text-xs font-extrabold uppercase tracking-luxury active:scale-98 transition-all"
            >
              Conclude Fitting & Open Reconciliation →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 3: RECONCILIATION CHECKLIST (KEEP VS REJECT) */}
      {/* ========================================================= */}
      {phase === 'reconciling' && (
        <div className="space-y-6">
          <div className="p-4 bg-[#111111] border-2 border-[#262626] flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                Phase 02 • Post-Fitting Manifest Reconciliation
              </span>
              <h2 className="text-xl font-black uppercase text-white tracking-tight mt-0.5">
                Item Verification Checklist
              </h2>
            </div>
            <span className="text-xs font-mono bg-neutral-800 text-neutral-200 px-3 py-1 border border-neutral-700">
              {keptItems.length} Kept / {items.length} Total
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-mono">
              Error: {errorMessage}
            </div>
          )}

          {/* Item Reconciliation Cards */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-5 border-2 space-y-4 transition-all ${
                  item.isKept === true
                    ? 'border-emerald-500/80 bg-[#07170E]'
                    : item.isKept === false
                    ? 'border-rose-900/60 bg-[#160A0A]'
                    : 'border-[#333333] bg-[#141414]'
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className="relative h-20 w-16 bg-neutral-900 shrink-0 border border-neutral-800 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover object-center"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase text-neutral-400">
                        {item.category}
                      </span>
                      {item.size && (
                        <span className="text-[9px] font-mono uppercase bg-neutral-800 text-neutral-300 px-1.5 py-0.5">
                          {item.size}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base tracking-tight truncate mt-0.5">
                      {item.title}
                    </h3>
                    <p className="font-mono text-xs text-neutral-300 font-semibold mt-1">
                      ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Decision Tag Pill */}
                  <div>
                    {item.isKept === true && (
                      <span className="text-[10px] font-mono uppercase bg-emerald-500 text-black font-extrabold px-2.5 py-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Kept
                      </span>
                    )}
                    {item.isKept === false && (
                      <span className="text-[10px] font-mono uppercase bg-rose-600 text-white font-extrabold px-2.5 py-1 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Returning
                      </span>
                    )}
                  </div>
                </div>

                {/* Keep vs Reject Toggle Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => handleSetItemDecision(item.id, true)}
                    className={`h-11 font-mono text-xs uppercase tracking-caps font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                      item.isKept === true
                        ? 'bg-emerald-400 border-emerald-300 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-[#1A1A1A] border-[#333333] text-neutral-300 hover:border-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Kept
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetItemDecision(item.id, false)}
                    className={`h-11 font-mono text-xs uppercase tracking-caps font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                      item.isKept === false
                        ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/20'
                        : 'bg-[#1A1A1A] border-[#333333] text-neutral-300 hover:border-rose-600'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Reject / Return
                  </button>
                </div>

                {/* Rejection Reason Selector (Only shown if marked rejected) */}
                {item.isKept === false && (
                  <div className="p-3 bg-[#0D0D0D] border border-rose-950 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                      Select Rejection Reason for Warehouse Dock Inwarding:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {REJECTION_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleSetRejectionReason(item.id, r)}
                          className={`p-2 text-left text-[10px] font-mono border transition-all ${
                            item.rejectionReason === r
                              ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                              : 'border-[#2A2A2A] bg-[#141414] text-neutral-400 hover:border-neutral-500'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Doorstep Payment Mode Selector */}
          {keptItems.length > 0 && (
            <div className="p-5 bg-[#0D0D0D] border-2 border-[#2A2A2A] space-y-3 font-mono text-xs">
              <span className="text-[10px] uppercase tracking-caps text-amber-400 font-bold block">
                Doorstep Payment Collection
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCollectedPaymentMode('upi')}
                  className={`h-11 border flex items-center justify-center gap-2 text-xs uppercase font-bold transition-all ${
                    collectedPaymentMode === 'upi'
                      ? 'bg-emerald-400 border-emerald-300 text-black'
                      : 'bg-[#141414] border-[#333333] text-neutral-300'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> UPI QR
                </button>
                <button
                  type="button"
                  onClick={() => setCollectedPaymentMode('card')}
                  className={`h-11 border flex items-center justify-center gap-2 text-xs uppercase font-bold transition-all ${
                    collectedPaymentMode === 'card'
                      ? 'bg-emerald-400 border-emerald-300 text-black'
                      : 'bg-[#141414] border-[#333333] text-neutral-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Card POS
                </button>
                <button
                  type="button"
                  onClick={() => setCollectedPaymentMode('cash')}
                  className={`h-11 border flex items-center justify-center gap-2 text-xs uppercase font-bold transition-all ${
                    collectedPaymentMode === 'cash'
                      ? 'bg-emerald-400 border-emerald-300 text-black'
                      : 'bg-[#141414] border-[#333333] text-neutral-300'
                  }`}
                >
                  <Banknote className="w-4 h-4" /> Cash
                </button>
              </div>

              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Payment Reference / UPI UTR / POS Slip (Optional)"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333333] px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Courier Notes Textarea */}
          <div className="p-4 bg-[#111111] border border-[#222222] space-y-2">
            <label className="block text-[11px] font-mono uppercase tracking-caps text-neutral-400">
              Courier Reconciliation Proof & Return Notes
            </label>
            <textarea
              rows={2}
              value={courierNotes}
              onChange={(e) => setCourierNotes(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#333333] p-3 text-xs font-mono text-neutral-200 focus:border-white focus:outline-none"
            />
          </div>

          {/* Dynamic Reconciled Billing Breakdown Bar */}
          <div className="p-6 bg-[#0D0D0D] border-2 border-[#2A2A2A] space-y-3 font-mono text-xs">
            <span className="text-[10px] uppercase tracking-caps text-neutral-400 block border-b border-[#222222] pb-2">
              Reconciled Financial Settlement (INR)
            </span>

            <div className="flex justify-between text-neutral-400">
              <span>Original Manifest Value</span>
              <span>₹{initialManifestTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Kept Merchandise ({keptItems.length} Items)</span>
              <span>₹{keptSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {keptSubtotal > 0 && (
              <>
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>CGST (6% Apparel)</span>
                  <span>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>SGST (6% Apparel)</span>
                  <span>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}

            <div className="border-t border-[#333333] pt-3 flex justify-between items-center text-sm">
              <span className="text-white font-bold uppercase tracking-caps">
                Final Collected Total
              </span>
              <span className="font-mono text-xl font-black text-white">
                ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Commit & Finalize Order Button */}
          <button
            onClick={handleFinalizeReconciliation}
            disabled={isFinalizing}
            className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-sm font-extrabold uppercase tracking-luxury active:scale-98 transition-all flex items-center justify-center gap-2 shadow-2xl"
          >
            {isFinalizing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Synchronizing Ledger via Authoritative Server RPC...
              </span>
            ) : (
              <span>Finalize & Commit Reconciled Order (₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
            )}
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 4: COMPLETED ORDER RECEIPT & SUMMARY */}
      {/* ========================================================= */}
      {phase === 'completed' && (
        <div className="p-8 bg-[#0D0D0D] border-2 border-emerald-500/60 text-center space-y-6 shadow-2xl animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400 block font-bold">
              Ledger Finalized • Server Reconciled
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
              Fitting Session Concluded
            </h2>
            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
              Order {orderData.id} has been finalized. Unwanted items marked for warehouse dock return inwarding.
            </p>
          </div>

          {/* Final Receipt Breakdown */}
          <div className="p-5 bg-[#141414] border border-[#222222] text-left font-mono text-xs space-y-3">
            <div className="flex justify-between border-b border-[#222222] pb-2">
              <span className="text-neutral-400">Customer</span>
              <span className="text-white font-bold">{orderData.customerName}</span>
            </div>
            <div className="flex justify-between border-b border-[#222222] pb-2">
              <span className="text-neutral-400">Payment Mode</span>
              <span className="text-cyan-400 font-bold uppercase">{collectedPaymentMode}</span>
            </div>
            <div className="flex justify-between border-b border-[#222222] pb-2">
              <span className="text-neutral-400">Kept Works</span>
              <span className="text-emerald-400 font-bold">{keptItems.length} Items Retained</span>
            </div>
            <div className="flex justify-between border-b border-[#222222] pb-2">
              <span className="text-neutral-400">Returned Works</span>
              <span className="text-rose-400 font-bold">{rejectedItems.length} Returning to Warehouse Dock</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-bold">
              <span className="text-white uppercase tracking-caps">Billed Amount</span>
              <span className="text-emerald-400">₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <Link
            href="/assigned-deliveries"
            className="block w-full h-14 bg-white text-black hover:bg-neutral-200 font-mono text-xs font-extrabold uppercase tracking-luxury flex items-center justify-center transition-all"
          >
            Return to Courier Manifest →
          </Link>
        </div>
      )}
    </div>
  )
}
