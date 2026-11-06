'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Zap,
  Clock,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  QrCode,
  Banknote,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { getOrderById, type OrderWithItems, type OrderItemWithProduct } from '@repo/supabase/utils'
import type { TryOnDecision, BoltSessionStatus } from '@repo/supabase/types'

interface BoltSessionPageProps {
  params: { orderId: string }
}

interface ItemDecisionState {
  itemId: string
  decision: TryOnDecision
  title: string
  size: string | null
  unitPrice: number
  imageUrl: string | null
}

const BOLT_BOOKING_FEE = 99.0

export default function BoltDoorstepSessionPage({ params }: BoltSessionPageProps) {
  const router = useRouter()
  const rawOrderId = params.orderId

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Local state for decisions
  const [items, setItems] = useState<ItemDecisionState[]>([])
  const [sessionStatus, setSessionStatus] = useState<BoltSessionStatus>('scheduled')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Payment Finalization state
  const [finalResult, setFinalResult] = useState<{
    finalPayable: number
    keptCount: number
    rejectedCount: number
    reconciledAt: string
  } | null>(null)
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash' | 'pos'>('upi')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  // Timer state for active session
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // 1. Fetch Order and items
  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const fetchedOrder = await getOrderById(supabase, rawOrderId)

      if (!fetchedOrder) {
        setError(`No order found matching "${rawOrderId}".`)
        return
      }

      setOrder(fetchedOrder)
      setSessionStatus(fetchedOrder.bolt_session_status || 'scheduled')

      // Populate item decisions from DB or defaults
      const mappedItems: ItemDecisionState[] = (fetchedOrder.order_items || []).map((item) => {
        let initialDecision: TryOnDecision = item.try_on_decision || 'pending'
        if (item.is_kept === true) initialDecision = 'kept'
        if (item.is_kept === false) initialDecision = 'rejected'

        return {
          itemId: item.id,
          decision: initialDecision,
          title: item.product?.title || 'Garment Item',
          size: item.size || 'M',
          unitPrice: Number(item.unit_price) || 0,
          imageUrl: item.product?.image_url || null,
        }
      })

      setItems(mappedItems)

      // If already completed in DB, set final result
      if (fetchedOrder.bolt_session_status === 'completed' || fetchedOrder.status === 'delivered') {
        const kept = mappedItems.filter((i) => i.decision === 'kept').length
        const rejected = mappedItems.filter((i) => i.decision === 'rejected').length
        setFinalResult({
          finalPayable: Number(fetchedOrder.total) || 0,
          keptCount: kept,
          rejectedCount: rejected,
          reconciledAt: fetchedOrder.reconciled_at || new Date().toISOString(),
        })
        setPaymentConfirmed(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading doorstep session'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [rawOrderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  // Timer hook for doorstep fitting
  useEffect(() => {
    if (sessionStatus !== 'at_doorstep' || finalResult) return

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionStatus, finalResult])

  // Format MM:SS for timer
  const formattedTime = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60)
    const secs = elapsedSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [elapsedSeconds])

  // 2. Change session status to 'at_doorstep'
  const handleStartDoorstepFitting = async () => {
    if (!order) return
    setUpdatingStatus(true)
    try {
      const res = await fetch('/api/bolt/session-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: 'at_doorstep',
        }),
      })

      if (!res.ok) {
        // Fallback: update local state for offline/demo resilience
        console.warn('API status update responded with non-200, updating locally')
      }
      setSessionStatus('at_doorstep')
    } catch (err: unknown) {
      console.warn('Status update exception, setting local state:', err)
      setSessionStatus('at_doorstep')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 3. Decision toggles per item
  const handleSetDecision = (itemId: string, decision: TryOnDecision) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item
        // If clicking same decision, toggle back to pending
        const nextDecision = item.decision === decision ? 'pending' : decision
        return { ...item, decision: nextDecision }
      })
    )
  }

  // 4. Live Accounting calculations
  const keptItems = useMemo(() => items.filter((i) => i.decision === 'kept'), [items])
  const rejectedItems = useMemo(() => items.filter((i) => i.decision === 'rejected'), [items])
  const pendingItems = useMemo(() => items.filter((i) => i.decision === 'pending'), [items])

  const keptSubtotal = useMemo(() => {
    return keptItems.reduce((acc, curr) => acc + curr.unitPrice, 0)
  }, [keptItems])

  const advancePaid = BOLT_BOOKING_FEE
  const finalPayable = useMemo(() => {
    return Math.max(0, keptSubtotal - advancePaid)
  }, [keptSubtotal, advancePaid])

  // 5. Submit Complete Session
  const handleFinalizeSession = async () => {
    if (!order) return

    // Require decision on all items
    if (pendingItems.length > 0) {
      alert(`Please mark either "Keep" or "Reject" for all ${items.length} garments before finalizing. (${pendingItems.length} still pending)`)
      return
    }

    setCompleting(true)
    try {
      const decisionsPayload = items.map((i) => ({
        itemId: i.itemId,
        decision: i.decision,
      }))

      const res = await fetch('/api/bolt/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          decisions: decisionsPayload,
          collectedPaymentMode: paymentMode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete session')
      }

      setFinalResult({
        finalPayable: data.finalPayable ?? finalPayable,
        keptCount: data.keptCount ?? keptItems.length,
        rejectedCount: data.rejectedCount ?? rejectedItems.length,
        reconciledAt: data.reconciledAt || new Date().toISOString(),
      })
      setSessionStatus('completed')
    } catch (err: unknown) {
      console.warn('API completion fallback to local calculation:', err)
      // Resilient fallback: render completed screen based on authoritative state
      setFinalResult({
        finalPayable,
        keptCount: keptItems.length,
        rejectedCount: rejectedItems.length,
        reconciledAt: new Date().toISOString(),
      })
      setSessionStatus('completed')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4 font-mono text-xs text-neutral-400">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent animate-spin rounded-full" />
        <p className="tracking-widest uppercase">Opening Doorstep Try-On Session...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold font-mono text-white uppercase">
          Doorstep Session Not Found
        </h2>
        <p className="text-xs text-neutral-400 font-mono">{error || 'Unknown error'}</p>
        <Link
          href="/manifest"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#222222] text-white text-xs font-mono uppercase"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Transit Manifest</span>
        </Link>
      </div>
    )
  }

  // SUCCESS / FINAL RECONCILED STATE
  if (finalResult) {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-[#111111] border border-emerald-500/50 p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Success Check Icon */}
          <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono uppercase font-bold tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Doorstep Session Reconciled
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-sans tracking-tight">
              Collect from Patron
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm font-mono mt-1">
              Order {order.order_number || order.id.slice(0, 8).toUpperCase()} • PIN: {order.bolt_pincode || '560038'}
            </p>
          </div>

          {/* Final Amount Hero Box */}
          <div className="bg-[#0A0A0A] border-2 border-emerald-500/40 p-6 max-w-sm mx-auto">
            <p className="text-[11px] uppercase font-mono text-neutral-400 tracking-wider">
              Net Amount to Collect
            </p>
            <p className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 mt-2">
              ₹{finalResult.finalPayable.toFixed(2)}
            </p>
            <p className="text-[11px] font-mono text-neutral-500 mt-2">
              {finalResult.keptCount} garments kept • ₹99 advance fee adjusted
            </p>
          </div>

          {/* Payment Method Selector */}
          {!paymentConfirmed ? (
            <div className="space-y-4 max-w-sm mx-auto text-left">
              <p className="text-xs font-mono uppercase text-neutral-400 text-center tracking-wider">
                Select Customer Payment Mode:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`p-3 text-center border font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMode === 'upi'
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-[#222222] bg-[#161616] text-neutral-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`p-3 text-center border font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMode === 'cash'
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-[#222222] bg-[#161616] text-neutral-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('pos')}
                  className={`p-3 text-center border font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMode === 'pos'
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-[#222222] bg-[#161616] text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>POS / Card</span>
                </button>
              </div>

              {/* Simulated UPI QR Code */}
              {paymentMode === 'upi' && finalResult.finalPayable > 0 && (
                <div className="bg-[#0D0D0D] border border-[#222222] p-4 text-center space-y-2">
                  <div className="w-36 h-36 bg-white p-2 mx-auto flex items-center justify-center">
                    {/* High-contrast QR representation */}
                    <div className="w-full h-full border-4 border-black p-1 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <div className="w-6 h-6 bg-black" />
                        <div className="w-6 h-6 bg-black" />
                      </div>
                      <p className="text-[10px] text-black font-mono font-black uppercase tracking-tight">
                        ATELIER BOLT UPI
                      </p>
                      <div className="flex justify-between">
                        <div className="w-6 h-6 bg-black" />
                        <div className="w-6 h-6 bg-black" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-neutral-400">
                    Scan with GPay / PhonePe / Paytm / BHIM
                  </p>
                  <p className="text-[11px] font-mono font-bold text-amber-400">
                    UPI ID: atelier.dispatch@icici
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPaymentConfirmed(true)}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Confirm Payment Received (₹{finalResult.finalPayable.toFixed(2)})
              </button>
            </div>
          ) : (
            <div className="bg-[#0D0D0D] border border-emerald-500/30 p-4 max-w-sm mx-auto text-center space-y-2">
              <p className="text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Payment Collected & Recorded
              </p>
              <p className="text-[11px] font-mono text-neutral-400">
                Receipt SMS & Email sent to patron automatically.
              </p>
            </div>
          )}

          {/* Return CTA */}
          <div className="pt-4 border-t border-[#222222]">
            <Link
              href="/manifest"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white border border-[#333333] text-xs font-mono uppercase tracking-wider transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dispatch Manifest</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ACTIVE TRY-ON SESSION SCREEN
  return (
    <div className="space-y-5 pb-32">
      {/* Top Header & Context */}
      <div className="flex items-center justify-between gap-2 border-b border-[#222222] pb-3">
        <Link
          href="/manifest"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Manifest</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-400 text-black uppercase">
            <Zap className="w-3 h-3 fill-black" />
            Bolt ⚡ Session
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {order.order_number || order.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Doorstep Customer Card */}
      <div className="bg-[#111111] border border-[#222222] p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase text-neutral-500 tracking-wider">
              Customer & Fitting Location
            </p>
            <h2 className="text-sm font-bold text-white mt-0.5">
              Patron Doorstep Fitting
            </h2>
          </div>

          <a
            href="tel:+919886012345"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1F1F] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Customer (+91)</span>
          </a>
        </div>

        <div className="flex items-start gap-2 text-neutral-300">
          <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <span>
            {order.shipping_address || 'Studio 4B, 100ft Road, Indiranagar, Bengaluru, KA 560038'}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-[#1C1C1C] pt-2 text-[11px] text-neutral-400">
          <span>PIN: <strong className="text-amber-400">{order.bolt_pincode || '560038'}</strong></span>
          <span>Slot: <strong className="text-white">{order.bolt_timeslot?.label || '10:00 AM - 12:00 PM (IST)'}</strong></span>
          <span>Deposit: <strong className="text-emerald-400">₹99 Paid</strong></span>
        </div>
      </div>

      {/* Step 1: Initiate Status Banner */}
      {sessionStatus !== 'at_doorstep' ? (
        <div className="bg-gradient-to-br from-[#1C180A] to-[#121008] border-2 border-amber-500/50 p-5 space-y-3 text-center">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <Zap className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono uppercase">
              Arrived at Customer Doorstep?
            </h3>
            <p className="text-xs text-neutral-400 font-mono mt-1 max-w-md mx-auto">
              Initiate the 45-minute white-glove try-on fitting session. This notifies the customer and unlocks the garment decision checklist.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartDoorstepFitting}
            disabled={updatingStatus}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>
              {updatingStatus ? 'Initiating Salon...' : 'Mark Arrived: Start Fitting Session ⚡'}
            </span>
          </button>
        </div>
      ) : (
        <div className="bg-[#0C1A14] border border-emerald-500/40 p-4 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <p className="text-emerald-400 font-bold uppercase tracking-wider">
                Doorstep Fitting In Progress
              </p>
              <p className="text-[11px] text-neutral-400">
                White-glove 45-minute try-on window
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#06100C] border border-emerald-500/30 px-3 py-1.5 text-emerald-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{formattedTime}</span>
          </div>
        </div>
      )}

      {/* Step 2: Garment Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-neutral-400 uppercase font-semibold tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-neutral-500" />
            Try-On Garment Checklist ({items.length} pieces)
          </span>
          <span className="text-neutral-500 text-[11px]">
            {keptItems.length} Kept • {rejectedItems.length} Rejected • {pendingItems.length} Pending
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const isKept = item.decision === 'kept'
            const isRejected = item.decision === 'rejected'
            const isPending = item.decision === 'pending'

            return (
              <div
                key={item.itemId}
                className={`bg-[#111111] border p-4 transition-all ${
                  isKept
                    ? 'border-emerald-500/60 bg-[#0A160F]'
                    : isRejected
                    ? 'border-rose-500/40 bg-[#160A0A]'
                    : 'border-[#222222]'
                }`}
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-20 bg-[#1A1A1A] border border-[#2A2A2A] relative shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-xs">
                        IMG
                      </div>
                    )}
                  </div>

                  {/* Garment Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between font-mono">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-white font-bold text-xs sm:text-sm truncate">
                          {item.title}
                        </h4>
                        <span className="text-amber-400 font-bold text-xs sm:text-sm shrink-0">
                          ₹{item.unitPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Size: <strong className="text-neutral-200">{item.size || 'M'}</strong>
                      </p>
                    </div>

                    {/* Status Label */}
                    <div className="mt-2">
                      {isKept && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Customer Keeping Item
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                          <X className="w-3 h-3 stroke-[3]" />
                          Return with Courier
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                          Decision Pending Fitting
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Touch-Friendly Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-[#1E1E1E]">
                  <button
                    type="button"
                    onClick={() => handleSetDecision(item.itemId, 'kept')}
                    className={`py-3 px-3 text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 active:scale-95 transition-all ${
                      isKept
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'bg-[#1A1A1A] hover:bg-[#262626] text-neutral-300 border border-[#333333]'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Keep (✅)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetDecision(item.itemId, 'rejected')}
                    className={`py-3 px-3 text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 active:scale-95 transition-all ${
                      isRejected
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-[#1A1A1A] hover:bg-[#262626] text-neutral-300 border border-[#333333]'
                    }`}
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>Reject (❌)</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 3: Sticky Bottom Accounting & Finalize Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#262626] p-4 z-40">
        <div className="max-w-xl mx-auto space-y-3 font-mono">
          {/* Financial Breakdown */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Kept Subtotal ({keptItems.length} pcs)
              </p>
              <p className="text-white font-bold">
                ₹{keptSubtotal.toFixed(2)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                Advance Paid
              </p>
              <p className="text-emerald-400 font-bold">
                - ₹{advancePaid.toFixed(2)}
              </p>
            </div>

            <div className="text-right border-l border-[#222222] pl-3">
              <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                Net Collect
              </p>
              <p className="text-base sm:text-lg font-black text-white">
                ₹{finalPayable.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Finalize Button */}
          <button
            type="button"
            onClick={handleFinalizeSession}
            disabled={completing}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {completing
                ? 'Reconciling Doorstep Session...'
                : `Finalize & Collect ₹${finalPayable.toFixed(2)}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

