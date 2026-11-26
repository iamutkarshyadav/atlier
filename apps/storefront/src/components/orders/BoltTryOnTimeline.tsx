'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Phone, RotateCcw, ShieldCheck, Zap } from 'lucide-react'
import {
  deriveCourierVerificationPin,
  formatIstTimestamp,
  reconcileBoltDoorstepSession,
  type BoltTimeslot,
  type OrderWithItems,
  type TryOnDecision,
} from '@repo/supabase/utils'
import {
  BOLT_HOLD_FEE,
  recalculateTryOnSettlement,
  type PromotionWithRules,
} from '@repo/supabase/pricing'
import { ProductImage } from '@/components/ui/ProductImage'

interface BoltTryOnTimelineProps {
  order: OrderWithItems
  courier?: { id: string; name: string; phone?: string | null } | null
  timeslot?: BoltTimeslot | null
  promotion?: PromotionWithRules | null
}

const BOLT_STAGES = [
  { key: 'confirmed', label: `Booking Confirmed (₹${BOLT_HOLD_FEE} Hold)` },
  { key: 'packed', label: 'Garments Packed' },
  { key: 'en_route', label: 'Courier En Route' },
  { key: 'trial_active', label: '45-Min Home Trial Active' },
  { key: 'completed', label: 'Trial Completed & Settlement' },
] as const

function resolveBoltStageIndex(order: OrderWithItems): number {
  const tryOnStatus = order.try_on_status
  const boltStatus = (order as unknown as { bolt_session_status?: string | null }).bolt_session_status

  if (
    order.status === 'delivered' ||
    tryOnStatus === 'reconciled' ||
    boltStatus === 'completed' ||
    boltStatus === 'settled'
  ) {
    return 4
  }
  if (
    tryOnStatus === 'fitting_in_progress' ||
    tryOnStatus === 'active_timer' ||
    tryOnStatus === 'reconciling' ||
    boltStatus === 'arrived_fitting' ||
    boltStatus === 'fitting_active' ||
    order.fitting_started_at
  ) {
    return 3
  }
  if (boltStatus === 'en_route' || order.status === 'out_for_delivery') {
    return 2
  }
  if (order.status === 'processing' || boltStatus === 'packing' || boltStatus === 'assigned') {
    return 1
  }
  return 0
}

function getItemDecisionPill(decision: string | null | undefined, isKept: boolean | null | undefined) {
  if (decision === 'kept' || isKept === true) {
    return {
      label: 'Kept',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    }
  }
  if (decision === 'rejected' || isKept === false) {
    return {
      label: 'Returned on Spot',
      className: 'bg-red-50 text-[#b91c1c] border-red-200',
    }
  }
  return {
    label: 'Pending Try-On',
    className: 'bg-[#f8f8f8] text-[#52565e] border-[#d3d6db]',
  }
}

export function BoltTryOnTimeline({
  order,
  courier,
  timeslot,
  promotion,
}: BoltTryOnTimelineProps) {
  const activeIndex = resolveBoltStageIndex(order)
  const isTrialActive = activeIndex === 3
  const verificationPin = useMemo(
    () => deriveCourierVerificationPin(order.order_number || order.id),
    [order.order_number, order.id]
  )

  // Live ticking MM:SS countdown when 45-min trial is active
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!isTrialActive) {
      setRemainingSeconds(null)
      return
    }

    const durationMinutes = Number(order.fitting_duration_minutes || 45)
    const startMs = order.fitting_started_at
      ? new Date(order.fitting_started_at).getTime()
      : Date.now()
    const endMs = startMs + durationMinutes * 60 * 1000

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000))
      setRemainingSeconds(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isTrialActive, order.fitting_started_at, order.fitting_duration_minutes])

  const formattedCountdown = useMemo(() => {
    if (remainingSeconds === null) return '45:00'
    const mins = Math.floor(remainingSeconds / 60)
    const secs = remainingSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [remainingSeconds])

  // Settlement Calculation reusing boltAccounting + recalculateTryOnSettlement
  const items = order.order_items || []
  const depositPaid = Number(order.shipping_fee ?? BOLT_HOLD_FEE)

  const reconciliation = useMemo(() => {
    return reconcileBoltDoorstepSession(
      items.map((it) => ({
        id: it.id,
        unit_price: Number(it.unit_price) || 0,
        quantity: Number(it.quantity) || 1,
        try_on_decision: (it.try_on_decision ||
          (it.is_kept === true ? 'kept' : it.is_kept === false ? 'rejected' : 'pending')) as TryOnDecision,
      })),
      depositPaid
    )
  }, [items, depositPaid])

  const promoReconciliation = useMemo(() => {
    const keptItems = items
      .filter((it) => it.try_on_decision === 'kept' || it.is_kept === true)
      .map((it) => ({
        productId: it.product_id,
        variantId: it.variant_id || it.id,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || 0,
        costPrice: 0,
      }))
    const rejectedItems = items
      .filter((it) => it.try_on_decision === 'rejected' || it.is_kept === false)
      .map((it) => ({
        productId: it.product_id,
        variantId: it.variant_id || it.id,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unit_price) || 0,
        costPrice: 0,
      }))

    const originalSubtotal = Number(
      order.original_total ??
        items.reduce((sum, it) => sum + Number(it.unit_price || 0) * (Number(it.quantity) || 1), 0)
    )

    return recalculateTryOnSettlement({
      originalAppliedPromotion: promotion || null,
      originalCouponCode: order.coupon_code || undefined,
      originalSubtotal,
      keptItems,
      rejectedItems,
      holdFeePaid: depositPaid,
    })
  }, [items, promotion, order.coupon_code, depositPaid])

  if (order.status === 'cancelled') {
    return (
      <div className="border border-rose-200 bg-rose-50/70 rounded-sm p-5 flex items-start gap-3 text-xs text-rose-900 font-sans">
        <RotateCcw className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider">Bolt Try-On Booking Cancelled</p>
          <p className="text-rose-800">
            Cancelled on {formatIstTimestamp(order.updated_at)}. Hold fee ₹{depositPaid} has been released.
          </p>
        </div>
      </div>
    )
  }

  const netPayableWithCredit = Math.max(
    0,
    promoReconciliation.finalPayable - reconciliation.depositCredit
  )

  return (
    <div className="space-y-6 font-sans text-[#14293a]">
      {/* 5-Stage Bolt Stepper Card */}
      <div className="border border-[#d3d6db] bg-white rounded-sm p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#b91c1c] fill-[#b91c1c]" strokeWidth={1.75} />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
              Bolt 45-Min Doorstep Try-On Tracker
            </h2>
          </div>

          {timeslot && (
            <span className="text-xs text-[#52565e]">
              Window: <strong className="text-[#14293a]">{timeslot.label}</strong>
            </span>
          )}
        </div>

        {/* Live Countdown Banner when Trial Active */}
        {isTrialActive && (
          <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#b91c1c]">
                  Home Fitting Session Live
                </p>
                <p className="text-xs text-[#52565e]">
                  Courier is waiting outside. Hand back any pieces you do not wish to keep before the timer ends.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#6c7079] block">
                Remaining Time
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums text-[#b91c1c]">
                {formattedCountdown}
              </span>
            </div>
          </div>
        )}

        {/* 5-Stage Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2">
          {BOLT_STAGES.map((stage, idx) => {
            const isCompleted = activeIndex > idx || (activeIndex === 4 && idx === 4)
            const isCurrent = activeIndex === idx && activeIndex < 4

            return (
              <div
                key={stage.key}
                className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2.5 sm:p-2 rounded-sm border sm:border-0 ${
                  isCurrent
                    ? 'border-[#b91c1c] bg-[#fef2f2]/40 sm:bg-transparent'
                    : 'border-[#e5e7eb]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-700 text-white'
                      : isCurrent
                        ? 'bg-[#b91c1c] text-white ring-2 ring-red-200'
                        : 'bg-[#f8f8f8] text-[#8a909a] border border-[#d3d6db]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : idx + 1}
                </div>
                <span
                  className={`text-xs leading-tight text-left sm:text-center ${
                    isCurrent || isCompleted ? 'font-bold text-[#14293a]' : 'text-[#8a909a]'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Courier Action + 4-Digit Verification PIN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#e5e7eb] text-xs">
          <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] block">
                Doorstep Courier
              </span>
              <span className="font-semibold text-[#14293a] block mt-0.5">
                {courier?.name || 'Assigned at Dispatch'}
              </span>
            </div>
            {courier?.phone && (
              <a
                href={`tel:${courier.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors shrink-0"
              >
                <Phone className="w-3 h-3" strokeWidth={1.75} />
                <span>Call Courier</span>
              </a>
            )}
          </div>

          <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] block">
                Doorstep Verification PIN
              </span>
              <span className="text-[11px] text-[#6c7079]">
                Share with courier upon arrival
              </span>
            </div>
            <span className="font-mono text-base font-bold tracking-[0.2em] px-3 py-1 bg-white border border-[#d3d6db] rounded-sm text-[#14293a]">
              {verificationPin}
            </span>
          </div>
        </div>
      </div>

      {/* Per-Item Try-On Decisions & ₹99 Hold Settlement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 border border-[#d3d6db] bg-white rounded-sm divide-y divide-[#e5e7eb]">
          <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
              Try-On Bag Status ({items.length})
            </h3>
            <span className="text-[11px] text-[#6c7079]">Updates live during trial</span>
          </div>

          {items.map((item) => {
            const pill = getItemDecisionPill(item.try_on_decision, item.is_kept)
            return (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 aspect-[3/4] bg-[#f5f5f4] border border-[#e5e7eb] rounded-sm overflow-hidden shrink-0">
                    <ProductImage
                      src={item.product?.image_url}
                      alt={item.product?.title || 'Garment'}
                      fill
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#14293a] truncate">
                      {item.product?.title || 'Maison TG Garment'}
                    </p>
                    <p className="text-[11px] text-[#6c7079] mt-0.5">
                      {item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity} · ₹
                      {Number(item.unit_price).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 text-[11px] font-semibold border rounded-sm shrink-0 ${pill.className}`}
                >
                  {pill.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Settlement Breakdown */}
        <div className="lg:col-span-5 border border-[#d3d6db] bg-[#f8f8f8] rounded-sm p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
              ₹{BOLT_HOLD_FEE} Hold Settlement
            </h3>
            <ShieldCheck className="w-4 h-4 text-[#14293a]" strokeWidth={1.75} />
          </div>

          {reconciliation.pendingCount > 0 && reconciliation.keptCount === 0 && reconciliation.rejectedCount === 0 ? (
            <>
              <div className="flex justify-between text-[#52565e]">
                <span>Try-On Bag Retail Value</span>
                <span className="font-semibold text-[#14293a] tabular-nums">
                  ₹
                  {Number(
                    order.original_total ??
                      items.reduce(
                        (sum, it) => sum + Number(it.unit_price || 0) * (Number(it.quantity) || 1),
                        0
                      )
                  ).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#52565e]">
                <span>Bolt Hold Paid</span>
                <span className="font-semibold text-[#14293a] tabular-nums">
                  ₹{depositPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-[#6c7079] leading-relaxed pt-2 border-t border-[#e5e7eb]">
                Your ₹{depositPaid} hold is credited toward any garments you choose to keep at final settlement.
              </p>
            </>
          ) : reconciliation.keptCount === 0 && reconciliation.rejectedCount > 0 ? (
            <>
              <div className="flex justify-between text-[#52565e]">
                <span>Kept Items Subtotal</span>
                <span className="font-semibold text-[#14293a] tabular-nums">₹0</span>
              </div>
              <div className="flex justify-between text-[#52565e]">
                <span>Bolt Convenience Hold Settled</span>
                <span className="font-semibold text-[#14293a] tabular-nums">
                  ₹{depositPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-t border-[#d3d6db] pt-2.5 flex justify-between text-sm font-bold text-[#14293a]">
                <span>Apparel Balance Due</span>
                <span className="tabular-nums">₹0</span>
              </div>
              <p className="text-[11px] text-[#6c7079] leading-relaxed">
                All pieces were returned on the spot. No apparel charge is billed; the ₹{depositPaid} hold covers the doorstep fitting session.
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-between text-[#52565e]">
                <span>Kept Items ({reconciliation.keptCount})</span>
                <span className="font-semibold text-[#14293a] tabular-nums">
                  ₹{Math.round(reconciliation.keptSubtotal).toLocaleString('en-IN')}
                </span>
              </div>
              {promoReconciliation.recalculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promotional Adjustment</span>
                  <span className="font-semibold tabular-nums">
                    -₹{Math.round(promoReconciliation.recalculatedDiscount).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#52565e]">
                <span>GST (12%)</span>
                <span className="font-semibold text-[#14293a] tabular-nums">
                  ₹{Math.round(promoReconciliation.recalculatedTax).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>₹{depositPaid} Bolt Hold Credit</span>
                <span className="font-semibold tabular-nums">
                  -₹{Math.round(reconciliation.depositCredit).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-t border-[#d3d6db] pt-2.5 flex justify-between text-sm font-bold text-[#14293a]">
                <span>Final Payable Balance</span>
                <span className="tabular-nums">
                  ₹{Math.round(netPayableWithCredit).toLocaleString('en-IN')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
