'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  formatIstTimestamp,
  type BoltTimeslot,
  type OrderWithItems,
  type ReturnRequest,
} from '@repo/supabase/utils'
import type { PromotionWithRules } from '@repo/supabase/pricing'
import { StandardOrderTimeline } from '@/components/orders/StandardOrderTimeline'
import { BoltTryOnTimeline } from '@/components/orders/BoltTryOnTimeline'
import { PostPurchaseActions } from '@/components/orders/PostPurchaseActions'
import { ProductImage } from '@/components/ui/ProductImage'

interface CourierInfo {
  id: string
  name: string
  phone?: string | null
}

export default function OrderLiveTrackingPage() {
  const params = useParams<{ orderId: string }>()
  const orderIdParam = params?.orderId ? decodeURIComponent(params.orderId) : ''

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [courier, setCourier] = useState<CourierInfo | null>(null)
  const [timeslot, setTimeslot] = useState<BoltTimeslot | null>(null)
  const [promotion, setPromotion] = useState<PromotionWithRules | null>(null)
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([])
  const [isAuthorizedOwner, setIsAuthorizedOwner] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchOrderDetails = useCallback(
    async (silent = false) => {
      if (!orderIdParam) return
      if (!silent) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const headers: HeadersInit = {}
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }

        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderIdParam)}?t=${Date.now()}`,
          { headers, cache: 'no-store' }
        )
        const data = await res.json()

        if (!res.ok || !data.success || !data.order) {
          setErrorMessage(data.error || `Order "${orderIdParam}" not found.`)
          setOrder(null)
          return
        }

        setErrorMessage(null)
        setOrder(data.order)
        setCourier(data.courier || null)
        setTimeslot(data.timeslot || null)
        setPromotion(data.promotion || null)
        setReturnRequests(Array.isArray(data.returnRequests) ? data.returnRequests : [])
        setIsAuthorizedOwner(Boolean(data.isAuthorizedOwner))
      } catch {
        setErrorMessage('Unable to reach order tracking service. Please try again.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [orderIdParam]
  )

  useEffect(() => {
    fetchOrderDetails()
  }, [fetchOrderDetails])

  // Subscribe to Supabase Realtime updates on `orders` and `order_items`
  useEffect(() => {
    if (!order?.id) return

    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`order_live_tracking_${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as Record<string, any>
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: updated.status ?? prev.status,
                    try_on_status: updated.try_on_status ?? prev.try_on_status,
                    bolt_session_status:
                      updated.bolt_session_status ?? (prev as any).bolt_session_status,
                    fitting_started_at:
                      updated.fitting_started_at ?? prev.fitting_started_at,
                    reconciled_at: updated.reconciled_at ?? prev.reconciled_at,
                    delivery_partner_id:
                      updated.delivery_partner_id ?? prev.delivery_partner_id,
                    tracking_barcode: updated.tracking_barcode ?? prev.tracking_barcode,
                    updated_at: updated.updated_at ?? new Date().toISOString(),
                  }
                : prev
            )
            // Refresh courier / full snapshot if courier changed
            fetchOrderDetails(true)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `order_id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedItem = payload.new as Record<string, any>
            setOrder((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                order_items: (prev.order_items || []).map((item) =>
                  item.id === updatedItem.id
                    ? {
                        ...item,
                        try_on_decision:
                          updatedItem.try_on_decision ?? item.try_on_decision,
                        is_kept: updatedItem.is_kept ?? item.is_kept,
                      }
                    : item
                ),
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.id, fetchOrderDetails])

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-white text-[#14293a] flex flex-col items-center justify-center px-6 py-24 text-center font-sans">
        <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider text-[#6c7079] font-medium">
          Loading Live Tracking...
        </span>
      </div>
    )
  }

  if (errorMessage || !order) {
    return (
      <div className="min-h-[70vh] bg-white text-[#14293a] flex items-center justify-center px-4 font-sans">
        <div className="max-w-md w-full border border-[#d3d6db] bg-[#f8f8f8] rounded-sm p-8 text-center space-y-4">
          <h1 className="text-lg font-bold text-[#14293a]">Order Not Found</h1>
          <p className="text-xs text-[#6c7079] leading-relaxed">
            {errorMessage || 'We could not locate this order reference.'}
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Back to Orders</span>
          </Link>
        </div>
      </div>
    )
  }

  const orderRef = order.order_number || order.id
  const isBolt = order.order_type === 'bolt_try_on' || order.delivery_mode === 'try_on'
  const returnMap = new Map(returnRequests.map((r) => [r.order_item_id, r]))

  return (
    <div className="min-h-screen bg-white text-[#14293a] font-sans pb-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#6c7079] font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">
            Home
          </Link>
          <span> / </span>
          <Link href="/orders" className="hover:text-[#14293a] transition-colors">
            Orders
          </Link>
          <span> / </span>
          <span className="text-[#14293a] font-semibold">{orderRef}</span>
        </nav>

        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#14293a] tracking-tight">
                Order {orderRef}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-[#d3d6db] bg-[#f8f8f8] rounded-sm text-[11px] font-semibold uppercase tracking-wider text-[#14293a]">
                {isBolt ? (
                  <>
                    <Zap className="w-3 h-3 text-[#b91c1c] fill-[#b91c1c]" strokeWidth={1.75} />
                    <span>Bolt 45-Min Try-On</span>
                  </>
                ) : (
                  <span>Standard Express</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Live Sync</span>
              </span>
            </div>
            <p className="text-xs text-[#6c7079]">
              Placed on {formatIstTimestamp(order.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchOrderDetails(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#d3d6db] hover:border-[#14293a] bg-white text-xs font-semibold text-[#14293a] rounded-sm transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                strokeWidth={1.75}
              />
              <span>Refresh</span>
            </button>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6c7079] hover:text-[#14293a]"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>All Orders</span>
            </Link>
          </div>
        </div>

        {/* Masked Guest PII Notice */}
        {!isAuthorizedOwner && (
          <div className="p-3.5 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-[#52565e]">
              <Lock className="w-3.5 h-3.5 text-[#14293a] shrink-0" strokeWidth={1.75} />
              <span>
                Street address and contact details are masked for guest reference lookups. Sign in with the ordering account to view full details.
              </span>
            </span>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/orders/${orderRef}`)}`}
              className="font-bold text-[#b91c1c] hover:underline shrink-0"
            >
              Sign In →
            </Link>
          </div>
        )}

        {/* Dual Fulfillment Timeline */}
        {isBolt ? (
          <BoltTryOnTimeline
            order={order}
            courier={courier}
            timeslot={timeslot}
            promotion={promotion}
          />
        ) : (
          <StandardOrderTimeline order={order} courier={courier} />
        )}

        {/* Standard Order Garments & Destination Details (Bolt displays item breakdown inside BoltTryOnTimeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {!isBolt && (
            <div className="lg:col-span-7 border border-[#d3d6db] bg-white rounded-sm divide-y divide-[#e5e7eb]">
              <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                  Items in Order ({order.order_items?.length || 0})
                </h3>
              </div>
              {(order.order_items || []).map((item) => {
                const req = returnMap.get(item.id)
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-14 aspect-[3/4] bg-[#f5f5f4] border border-[#e5e7eb] rounded-sm overflow-hidden shrink-0">
                        <ProductImage
                          src={item.product?.image_url}
                          alt={item.product?.title || 'Garment'}
                          fill
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`/product/${item.product_id}`}
                          className="text-xs font-bold text-[#14293a] hover:text-[#b91c1c] transition-colors block truncate"
                        >
                          {item.product?.title || 'Maison TG Garment'}
                        </Link>
                        <p className="text-[11px] text-[#6c7079]">
                          {item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}
                        </p>
                        {req && (
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm text-[#14293a]">
                            {req.request_type === 'exchange'
                              ? `Exchange Requested (${req.replacement_size})`
                              : `Return Requested (${req.status})`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#14293a] tabular-nums shrink-0">
                      ₹{Number(item.unit_price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Destination & Totals Card */}
          <div
            className={`${
              isBolt ? 'lg:col-span-12' : 'lg:col-span-5'
            } border border-[#d3d6db] bg-[#f8f8f8] rounded-sm p-5 space-y-4 text-xs`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#14293a]" strokeWidth={1.75} />
                  Delivery Destination
                </span>
                <p className="text-[#14293a] leading-relaxed font-medium">
                  {order.shipping_address || 'Destination verified'}
                </p>
              </div>

              <div className="space-y-1.5 md:border-l md:border-[#e5e7eb] md:pl-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6c7079] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#14293a]" strokeWidth={1.75} />
                  Payment &amp; Totals
                </span>
                <div className="flex justify-between text-[#52565e]">
                  <span>Order Subtotal</span>
                  <span className="font-semibold text-[#14293a] tabular-nums">
                    ₹{Number(order.original_total ?? order.total ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(order.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-[#52565e]">
                    <span>GST Included</span>
                    <span className="font-semibold text-[#14293a] tabular-nums">
                      ₹{Number(order.tax_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#14293a] pt-1 border-t border-[#e5e7eb]">
                  <span>{isBolt ? 'Authorized Hold' : 'Total Billed'}</span>
                  <span className="tabular-nums">
                    ₹{Number(order.total ?? order.original_total ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post-Purchase Actions: Invoice, Exchange/Return, Help */}
        <PostPurchaseActions
          order={order}
          orderRef={orderRef}
          returnRequests={returnRequests}
          onReturnCreated={(req) => setReturnRequests((prev) => [req, ...prev])}
        />
      </div>
    </div>
  )
}
