'use client'

import React, { useEffect, useState } from 'react'
import {
  Check,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  sortSizes,
  type OrderWithItems,
  type ReturnRequest,
} from '@repo/supabase/utils'

interface PostPurchaseActionsProps {
  order: OrderWithItems
  orderRef: string
  returnRequests: ReturnRequest[]
  onReturnCreated: (req: ReturnRequest) => void
}

const RETURN_REASONS = [
  'Size too small',
  'Size too large',
  'Fit did not match expectations',
  'Fabric or stitching concern',
  'Changed mind',
] as const

function getReplacementSizesForItem(currentSize?: string | null, category?: string | null): string[] {
  const clean = currentSize?.trim()
  const isNumeric =
    (clean && /^\d+$/.test(clean)) ||
    category?.toLowerCase().includes('denim') ||
    category?.toLowerCase().includes('pant') ||
    category?.toLowerCase().includes('trouser')
  const pool = isNumeric ? ['28', '30', '32', '34', '36'] : ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  return sortSizes(pool.filter((sz) => sz.toLowerCase() !== (clean || '').toLowerCase()))
}

export function PostPurchaseActions({
  order,
  orderRef,
  returnRequests,
  onReturnCreated,
}: PostPurchaseActionsProps) {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const items = order.order_items || []
  const isBolt = order.order_type === 'bolt_try_on' || order.delivery_mode === 'try_on'
  const requestedItemIds = new Set(returnRequests.map((r) => r.order_item_id))

  const eligibleItems = items.filter((item) => {
    if (order.status !== 'delivered') return false
    if (requestedItemIds.has(item.id)) return false
    if (isBolt && (item.is_kept === false || item.try_on_decision === 'rejected')) {
      return false
    }
    return true
  })

  const [selectedItemId, setSelectedItemId] = useState<string>(eligibleItems[0]?.id || '')
  const [requestType, setRequestType] = useState<'exchange' | 'return'>('exchange')
  const [replacementSize, setReplacementSize] = useState<string>('')
  const [reason, setReason] = useState<string>(RETURN_REASONS[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const activeItem = eligibleItems.find((i) => i.id === selectedItemId) || eligibleItems[0] || null
  const sizeOptions = activeItem
    ? getReplacementSizesForItem(activeItem.size, activeItem.product?.category)
    : []

  useEffect(() => {
    if (isReturnModalOpen && eligibleItems.length > 0) {
      const first = eligibleItems[0]!
      setSelectedItemId(first.id)
      const opts = getReplacementSizesForItem(first.size, first.product?.category)
      setReplacementSize(opts[0] || '')
      setFeedback(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturnModalOpen])

  useEffect(() => {
    if (!isReturnModalOpen && !isHelpOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReturnModalOpen(false)
        setIsHelpOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isReturnModalOpen, isHelpOpen])

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId)
    const item = eligibleItems.find((i) => i.id === itemId)
    const opts = getReplacementSizesForItem(item?.size, item?.product?.category)
    setReplacementSize(opts[0] || '')
  }

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeItem) return

    setIsSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderRef)}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: activeItem.id,
          requestType,
          replacementSize: requestType === 'exchange' ? replacementSize : undefined,
          reason,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Could not submit request.' })
        return
      }

      onReturnCreated(data.returnRequest)
      setFeedback({
        type: 'success',
        text:
          requestType === 'exchange'
            ? `Size exchange to ${replacementSize} requested.`
            : 'Return pickup requested.',
      })
      setTimeout(() => {
        setIsReturnModalOpen(false)
        setNotes('')
      }, 1200)
    } catch {
      setFeedback({ type: 'error', text: 'Network error submitting request.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const orderDisplay = order.order_number || orderRef
  const whatsappText = encodeURIComponent(
    `Hello Maison TG Concierge, I need assistance with my order ${orderDisplay}.`
  )
  const emailSubject = encodeURIComponent(`Maison TG Order Assistance — ${orderDisplay}`)

  return (
    <>
      <div className="border border-[#d3d6db] bg-white rounded-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
            Order Documents &amp; Support
          </h3>
          <p className="text-xs text-[#6c7079] mt-0.5">
            Download GST tax invoice, request a size exchange, or reach client concierge.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/orders/${encodeURIComponent(orderRef)}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#14293a] bg-white hover:bg-[#14293a] text-[#14293a] hover:text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Download GST Invoice</span>
          </a>

          {order.status === 'delivered' && eligibleItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#d3d6db] hover:border-[#14293a] bg-[#f8f8f8] text-[#14293a] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Exchange / Return</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#d3d6db] hover:border-[#14293a] bg-white text-[#14293a] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Need Help</span>
          </button>
        </div>
      </div>

      {/* Size Exchange / Return Modal */}
      {isReturnModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Request Size Exchange or Return"
          onClick={() => setIsReturnModalOpen(false)}
        >
          <div
            className="bg-white border border-[#d3d6db] rounded-sm max-w-md w-full max-h-[90dvh] overflow-y-auto overscroll-contain p-6 space-y-5 font-sans text-[#14293a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14293a]">Exchange or Return Garment</h3>
                <p className="text-xs text-[#6c7079]">14-day complimentary pickup on kept items</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[#6c7079] hover:text-[#14293a] cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 text-xs rounded-sm border flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-[#b91c1c] border-red-200'
                }`}
              >
                {feedback.type === 'success' && <Check className="w-4 h-4 shrink-0" strokeWidth={2} />}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#14293a] block mb-1.5">
                  Select Garment
                </label>
                <select
                  value={activeItem?.id || ''}
                  onChange={(e) => handleItemChange(e.target.value)}
                  className="w-full border border-[#d3d6db] rounded-sm px-3 py-2 bg-white text-[#14293a]"
                >
                  {eligibleItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.product?.title || 'Garment'} {it.size ? `(Size ${it.size})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="font-bold uppercase tracking-wider text-[#14293a] block mb-1.5">
                  Request Type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('exchange')}
                    className={`py-2 px-3 border rounded-sm font-bold uppercase tracking-wider cursor-pointer ${
                      requestType === 'exchange'
                        ? 'bg-[#14293a] text-white border-[#14293a]'
                        : 'bg-white text-[#14293a] border-[#d3d6db]'
                    }`}
                  >
                    Size Exchange
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('return')}
                    className={`py-2 px-3 border rounded-sm font-bold uppercase tracking-wider cursor-pointer ${
                      requestType === 'return'
                        ? 'bg-[#14293a] text-white border-[#14293a]'
                        : 'bg-white text-[#14293a] border-[#d3d6db]'
                    }`}
                  >
                    Return for Refund
                  </button>
                </div>
              </div>

              {requestType === 'exchange' && sizeOptions.length > 0 && (
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#14293a] block mb-1.5">
                    Replacement Size
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {sizeOptions.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setReplacementSize(sz)}
                        className={`py-2 text-center font-mono font-bold border rounded-sm cursor-pointer ${
                          replacementSize === sz
                            ? 'bg-[#14293a] text-white border-[#14293a]'
                            : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold uppercase tracking-wider text-[#14293a] block mb-1.5">
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-[#d3d6db] rounded-sm px-3 py-2 bg-white text-[#14293a]"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#14293a] block mb-1.5">
                  Additional Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred pickup timing or fit note..."
                  className="w-full border border-[#d3d6db] rounded-sm p-2.5 text-xs focus:outline-none focus:border-[#14293a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 border border-[#d3d6db] rounded-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white font-bold uppercase tracking-wider rounded-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Need Help Concierge Drawer */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Order Concierge Help"
          onClick={() => setIsHelpOpen(false)}
        >
          <aside
            className="w-full max-w-md h-full bg-white border-l border-[#d3d6db] flex flex-col font-sans text-[#14293a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
                Client Concierge · {orderDisplay}
              </span>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                aria-label="Close help drawer"
                className="p-1 text-[#6c7079] hover:text-[#14293a] cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 text-xs">
              <div className="space-y-2.5">
                <a
                  href={`https://wa.me/918045681000?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-3.5 border border-[#14293a] bg-[#14293a] hover:bg-[#b91c1c] hover:border-[#b91c1c] text-white rounded-sm flex items-center justify-between transition-colors"
                >
                  <span className="inline-flex items-center gap-2 font-bold uppercase tracking-wider">
                    <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
                    <span>WhatsApp Concierge</span>
                  </span>
                  <span className="text-[11px] opacity-85">Prefilled order ref</span>
                </a>

                <a
                  href={`mailto:concierge@maisontg.com?subject=${emailSubject}`}
                  className="w-full p-3.5 border border-[#d3d6db] hover:border-[#14293a] bg-white text-[#14293a] rounded-sm flex items-center justify-between transition-colors"
                >
                  <span className="inline-flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Mail className="w-4 h-4" strokeWidth={1.75} />
                    <span>Email Support</span>
                  </span>
                  <span className="text-[11px] text-[#6c7079]">concierge@maisontg.com</span>
                </a>
              </div>

              <div className="border-t border-[#e5e7eb] pt-4 space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#6c7079]">
                  Quick Answers
                </h4>

                <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm space-y-1">
                  <p className="font-bold text-[#14293a]">How is the ₹99 Bolt Hold settled?</p>
                  <p className="text-[#52565e] leading-relaxed">
                    The ₹99 doorstep hold is credited in full toward any kept items. If all items are returned on the spot, ₹0 apparel balance is due and the ₹99 fee covers the home salon visit.
                  </p>
                </div>

                <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm space-y-1">
                  <p className="font-bold text-[#14293a]">Can I exchange sizes after delivery?</p>
                  <p className="text-[#52565e] leading-relaxed">
                    Yes. Kept items on delivered orders are eligible for a complimentary size exchange or return within 14 days using the Exchange / Return action on this page.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
