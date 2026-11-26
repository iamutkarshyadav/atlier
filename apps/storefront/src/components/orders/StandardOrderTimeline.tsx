'use client'

import React, { useState } from 'react'
import { Check, Copy, Package, RotateCcw, Truck } from 'lucide-react'
import { formatIstTimestamp, type OrderWithItems } from '@repo/supabase/utils'

interface StandardOrderTimelineProps {
  order: OrderWithItems
  courier?: { id: string; name: string; phone?: string | null } | null
}

const STANDARD_STAGES = [
  { key: 'confirmed', label: 'Order Confirmed' },
  { key: 'packed', label: 'Packed at Atelier' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const

function resolveStandardStageIndex(status: string): number {
  switch (status) {
    case 'pending':
      return 0
    case 'processing':
      return 2
    case 'out_for_delivery':
      return 3
    case 'delivered':
      return 4
    default:
      return 0
  }
}

export function StandardOrderTimeline({ order, courier }: StandardOrderTimelineProps) {
  const [copiedAwb, setCopiedAwb] = useState(false)

  const awbCode = order.tracking_barcode || 'Pending assignment'
  const hasAwb = Boolean(order.tracking_barcode)

  const handleCopyAwb = () => {
    if (!hasAwb || typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(awbCode)
    setCopiedAwb(true)
    setTimeout(() => setCopiedAwb(false), 2000)
  }

  if (order.status === 'cancelled') {
    return (
      <div className="border border-rose-200 bg-rose-50/70 rounded-sm p-5 flex items-start gap-3 text-xs text-rose-900 font-sans">
        <RotateCcw className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider">Order Cancelled</p>
          <p className="text-rose-800">
            This dispatch was voided on {formatIstTimestamp(order.updated_at)}. Any authorized payment is released automatically.
          </p>
        </div>
      </div>
    )
  }

  const activeIndex = resolveStandardStageIndex(order.status)

  return (
    <div className="border border-[#d3d6db] bg-white rounded-sm p-5 sm:p-6 space-y-6 font-sans text-[#14293a]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#14293a]" strokeWidth={1.75} />
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
            Express Fulfillment Progress
          </h2>
        </div>
        <span className="text-xs text-[#6c7079]">
          Updated: <strong className="text-[#14293a]">{formatIstTimestamp(order.updated_at)}</strong>
        </span>
      </div>

      {/* 5-Stage Visual Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2">
        {STANDARD_STAGES.map((stage, idx) => {
          const isCompleted = activeIndex > idx || (activeIndex === 4 && idx === 4)
          const isCurrent = activeIndex === idx && activeIndex < 4

          return (
            <div
              key={stage.key}
              className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2.5 sm:p-2 rounded-sm border sm:border-0 ${
                isCurrent
                  ? 'border-[#14293a] bg-[#f8f8f8] sm:bg-transparent'
                  : 'border-[#e5e7eb]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isCompleted
                    ? 'bg-emerald-700 text-white'
                    : isCurrent
                      ? 'bg-[#14293a] text-white ring-2 ring-[#d3d6db]'
                      : 'bg-[#f8f8f8] text-[#8a909a] border border-[#d3d6db]'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : idx + 1}
              </div>

              <div className="space-y-0.5 text-left sm:text-center">
                <p
                  className={`text-xs leading-tight ${
                    isCurrent || isCompleted ? 'font-bold text-[#14293a]' : 'text-[#8a909a]'
                  }`}
                >
                  {stage.label}
                </p>
                {idx === 0 && (
                  <p className="text-[10px] text-[#6c7079]">{formatIstTimestamp(order.created_at)}</p>
                )}
                {idx === 4 && order.status === 'delivered' && (
                  <p className="text-[10px] text-emerald-700 font-medium">
                    {formatIstTimestamp(order.updated_at)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Carrier & Copyable AWB Metadata Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#e5e7eb] text-xs">
        <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] block">
              Courier Partner
            </span>
            <span className="font-semibold text-[#14293a] flex items-center gap-1.5 mt-0.5">
              <Package className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
              <span>{courier?.name || 'Maison TG Priority Express'}</span>
            </span>
          </div>
        </div>

        <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] block">
              Tracking AWB / Barcode
            </span>
            <span className="font-mono font-bold text-[#14293a] truncate block mt-0.5">
              {awbCode}
            </span>
          </div>
          {hasAwb && (
            <button
              type="button"
              onClick={handleCopyAwb}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#d3d6db] hover:border-[#14293a] text-[11px] font-semibold text-[#14293a] rounded-sm transition-colors cursor-pointer shrink-0"
            >
              {copiedAwb ? (
                <>
                  <Check className="w-3 h-3 text-emerald-700" strokeWidth={2} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" strokeWidth={1.75} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
