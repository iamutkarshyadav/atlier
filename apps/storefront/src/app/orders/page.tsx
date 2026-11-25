'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Package,
  Clock,
  CheckCircle2,
  Check,
  Truck,
  RotateCcw,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Search,
  Zap,
  ArrowRight,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Star,
  Sparkles,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import type { OrderWithItems, OrderStatus } from '@repo/supabase/types'
import { ReviewGarmentModal } from '@/components/reviews/ReviewGarmentModal'

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Guest lookup & Tab state
  const [activeTab, setActiveTab] = useState<'my_orders' | 'track_guest'>('my_orders')
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResult, setTrackResult] = useState<OrderWithItems | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [recentGuestRefs, setRecentGuestRefs] = useState<string[]>([])

  // Review Modal state
  const [userReviewsMap, setUserReviewsMap] = useState<Record<string, any>>({})
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null)
  const [selectedExistingReview, setSelectedExistingReview] = useState<any | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  // 1. Resolve logged in user session
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || null)
        setUserId(session.user.id)
        const name =
          session.user.user_metadata?.name ||
          (session.user.email ? session.user.email.split('@')[0] : 'Patron')
        setUserName(name)
      }
    })

    // Read stored recent order references
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('patron_recent_orders')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) setRecentGuestRefs(parsed)
        }
      }
    } catch {}
  }, [])

  // 2. Fetch customer orders
  const loadOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
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

      let storedRefs: string[] = []
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('patron_recent_orders')
          if (stored) storedRefs = JSON.parse(stored)
        }
      } catch {}

      const res = await fetch(`/api/orders?t=${Date.now()}`, { headers, cache: 'no-store' })
      const data = await res.json()

      let fetchedOrders: OrderWithItems[] = []
      if (data.success && Array.isArray(data.orders)) {
        fetchedOrders = data.orders
      }

      if (storedRefs.length > 0) {
        for (const ref of storedRefs.slice(0, 5)) {
          if (!fetchedOrders.some((o) => o.order_number === ref || o.id === ref)) {
            try {
              const guestRes = await fetch(`/api/orders?search=${encodeURIComponent(ref)}`)
              const guestData = await guestRes.json()
              if (guestData.success && guestData.order) {
                fetchedOrders.push(guestData.order)
              }
            } catch {}
          }
        }
      }

      setOrders(fetchedOrders)

      // Fetch user's existing reviews to sync button statuses
      try {
        const revRes = await fetch(`/api/reviews/user?t=${Date.now()}`, { headers })
        const revData = await revRes.json()
        if (revData.success && revData.reviewsByOrderItem) {
          setUserReviewsMap(revData.reviewsByOrderItem)
        }
      } catch {}
    } catch (err) {
      console.warn('Orders fetch error:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('storefront_customer_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any
            if (updatedRow && updatedRow.id) {
              setOrders((prev) =>
                prev.map((ord) =>
                  ord.id === updatedRow.id || ord.order_number === updatedRow.order_number
                    ? {
                        ...ord,
                        status: updatedRow.status || ord.status,
                        try_on_status: updatedRow.try_on_status || ord.try_on_status,
                        delivery_courier_id: updatedRow.delivery_courier_id ?? (ord as any).delivery_courier_id,
                        delivery_partner_id: updatedRow.delivery_partner_id ?? (ord as any).delivery_partner_id,
                        updated_at: updatedRow.updated_at || new Date().toISOString(),
                      }
                    : ord
                )
              )
              setTrackResult((prev) => {
                if (!prev) return null
                if (prev.id === updatedRow.id || prev.order_number === updatedRow.order_number) {
                  return {
                    ...prev,
                    status: updatedRow.status || prev.status,
                    try_on_status: updatedRow.try_on_status || prev.try_on_status,
                    updated_at: updatedRow.updated_at || new Date().toISOString(),
                  }
                }
                return prev
              })
            }
          } else if (payload.eventType === 'INSERT') {
            loadOrders(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadOrders])

  // Automatically trigger review modal popup when an order status is settled with delivered
  useEffect(() => {
    if (isLoading || orders.length === 0) return
    const deliveredOrder = orders.find((o) => o.status === 'delivered')
    if (!deliveredOrder) return

    for (const itm of deliveredOrder.order_items || []) {
      const isBolt = deliveredOrder.order_type === 'bolt_try_on' || deliveredOrder.delivery_mode === 'try_on'
      const isRejected = isBolt && ((itm as any).is_kept === false || (itm as any).try_on_decision === 'rejected')

      if (!isRejected && !userReviewsMap[itm.id]) {
        const promptKey = `auto_prompted_order_review_${deliveredOrder.id}`
        if (typeof window !== 'undefined' && !sessionStorage.getItem(promptKey)) {
          sessionStorage.setItem(promptKey, 'true')
          setSelectedReviewItem({
            id: itm.id,
            order_id: deliveredOrder.id,
            product_id: itm.product_id,
            product: itm.product,
            size: itm.size,
            is_bolt: isBolt,
          })
          setSelectedExistingReview(null)
          setIsReviewModalOpen(true)
        }
        break
      }
    }
  }, [orders, isLoading, userReviewsMap])

  // 3. Handle Guest Lookup
  const handleTrackLookup = async (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault()
    const code = (directCode || trackQuery).trim()
    if (!code) return

    setTrackLoading(true)
    setTrackError(null)
    setTrackResult(null)

    try {
      const res = await fetch(`/api/orders?search=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (data.success && data.order) {
        setTrackResult(data.order)

        try {
          if (typeof window !== 'undefined') {
            const raw = localStorage.getItem('patron_recent_orders')
            const list: string[] = raw ? JSON.parse(raw) : []
            if (!list.includes(code)) {
              list.unshift(code)
              localStorage.setItem('patron_recent_orders', JSON.stringify(list.slice(0, 10)))
              setRecentGuestRefs(list)
            }
          }
        } catch {}
      } else {
        setTrackError(
          data.error || `No active dispatch record found for "${code}". Please verify your order number.`
        )
      }
    } catch {
      setTrackError('Could not connect to fulfillment radar. Please verify your connection.')
    } finally {
      setTrackLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    setUserEmail(null)
    setUserName(null)
    setUserId(null)
    router.refresh()
  }

  const visibleOrders = orders.filter((o) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = o.order_number?.toLowerCase().includes(q)
      const matchTrack = o.tracking_barcode?.toLowerCase().includes(q)
      const matchProd = o.order_items?.some((i) => i.product?.title?.toLowerCase().includes(q))
      return Boolean(matchNum || matchTrack || matchProd)
    }
    return true
  })

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-sm">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Order Confirmed</span>
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold rounded-sm">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Preparing in Atelier</span>
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold rounded-sm">
            <Truck className="w-3.5 h-3.5 text-purple-600" />
            <span>Out for Delivery</span>
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivered</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold rounded-sm">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled &amp; Refunded</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f8f8] text-[#14293a] text-xs font-semibold rounded-sm border border-[#d3d6db]">
            <span>{status}</span>
          </span>
        )
    }
  }

  const renderProgressSteps = (status: OrderStatus) => {
    const steps = [
      { key: 'pending', label: 'Order Confirmed' },
      { key: 'processing', label: 'Atelier Prep' },
      { key: 'out_for_delivery', label: 'Courier Transit' },
      { key: 'delivered', label: 'Delivered / Settled' },
    ]

    const statusWeights: Record<string, number> = {
      pending: 1,
      processing: 2,
      out_for_delivery: 3,
      delivered: 4,
      cancelled: 0,
    }

    const currentWeight = statusWeights[status] || 1

    if (status === 'cancelled') {
      return (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between rounded-sm my-3 font-sans">
          <span>This order has been cancelled and stock allocation restored to the atelier.</span>
          <span className="font-bold uppercase text-rose-700">Voided</span>
        </div>
      )
    }

    return (
      <div className="py-4 border-y border-[#e5e7eb] my-4 font-sans">
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => {
            const stepWeight = idx + 1
            const isCompleted = currentWeight > stepWeight
            const isCurrent = currentWeight === stepWeight

            return (
              <div key={step.key} className="flex flex-col items-center text-center space-y-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#b91c1c] text-white'
                      : isCurrent
                      ? 'bg-[#14293a] text-white ring-2 ring-neutral-300 shadow-sm'
                      : 'bg-[#f8f8f8] text-[#8a909a] border border-[#d3d6db]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 text-white" /> : stepWeight}
                </div>
                <span
                  className={`text-[10px] sm:text-xs uppercase tracking-wider leading-tight ${
                    isCurrent
                      ? 'font-bold text-[#14293a]'
                      : isCompleted
                      ? 'text-[#14293a] font-medium'
                      : 'text-[#8a909a]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderOrderCard = (ord: OrderWithItems) => {
    const items = ord.order_items || []
    const orderDate = new Date(ord.created_at || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <div
        key={ord.id}
        className="bg-white border border-[#d3d6db] rounded-sm p-5 sm:p-6 space-y-4 shadow-xs hover:border-[#14293a] transition-all font-sans"
      >
        {/* Order Card Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#e5e7eb]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#14293a] uppercase">
                {ord.order_number || ord.id}
              </span>
              <span className="text-[10px] bg-[#f8f8f8] text-[#14293a] px-2 py-0.5 border border-[#d3d6db] rounded-sm uppercase font-semibold flex items-center gap-1">
                {ord.order_type === 'bolt_try_on' || ord.delivery_mode === 'try_on' ? (
                  <>
                    <Zap className="w-3 h-3 fill-[#b91c1c] text-[#b91c1c]" /> Bolt Try-On Booking
                  </>
                ) : (
                  'Standard Dispatch'
                )}
              </span>
            </div>
            <p className="text-[11px] text-[#6c7079]">Placed on {orderDate}</p>
          </div>

          <div>{getStatusBadge(ord.status)}</div>
        </div>

        {/* Real-time Visual Progress Stepper */}
        {renderProgressSteps(ord.status)}

        {/* Settled & Delivered Review Banner */}
        {ord.status === 'delivered' && (
          <div className="bg-white border border-[#e5e7eb] rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-[#14293a] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#14293a]/5 border border-[#14293a]/10 flex items-center justify-center text-[#14293a] shrink-0">
                <Star className="w-4 h-4 fill-[#14293a] text-[#14293a]" />
              </div>
              <div>
                <h5 className="font-sans font-bold text-xs text-[#14293a]">
                  Delivered — Rate Your Purchase & Fit
                </h5>
                <p className="text-[11px] text-[#6c7079] mt-0.5">
                  Share your feedback on sizing, quality, and fit to help fellow shoppers.
                </p>
              </div>
            </div>
            {(() => {
              const firstUnreviewed = items.find((itm) => {
                const isB = ord.order_type === 'bolt_try_on' || ord.delivery_mode === 'try_on'
                const isRej = isB && ((itm as any).is_kept === false || (itm as any).try_on_decision === 'rejected')
                return !isRej && !userReviewsMap[itm.id]
              })
              if (!firstUnreviewed) return null
              return (
                <button
                  type="button"
                  onClick={() => {
                    const isB = ord.order_type === 'bolt_try_on' || ord.delivery_mode === 'try_on'
                    setSelectedReviewItem({
                      id: firstUnreviewed.id,
                      order_id: ord.id,
                      product_id: firstUnreviewed.product_id,
                      product: firstUnreviewed.product,
                      size: firstUnreviewed.size,
                      is_bolt: isB,
                    })
                    setSelectedExistingReview(null)
                    setIsReviewModalOpen(true)
                  }}
                  className="px-4 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-sans font-semibold rounded-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Rate & Review</span>
                </button>
              )
            })()}
          </div>
        )}

        {/* Garment Items List */}
        <div className="space-y-2">
          <h4 className="text-[11px] uppercase tracking-wider text-[#6c7079] font-bold">
            Items in Order ({items.length})
          </h4>
          <div className="divide-y divide-[#e5e7eb] border-y border-[#e5e7eb]">
            {items.map((item, idx) => {
              const prod = item.product
              return (
                <div key={item.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 bg-[#f8f8f8] relative overflow-hidden shrink-0 border border-[#d3d6db] rounded-sm">
                      {prod?.image_url ? (
                        <Image
                          src={prod.image_url}
                          alt={prod.title || 'Piece'}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8a909a]">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#14293a]">
                        {prod?.title || 'Garment Piece'}
                      </h5>
                      <div className="flex items-center gap-2 text-[11px] text-[#6c7079] mt-0.5">
                        {item.size && (
                          <span className="bg-[#f8f8f8] text-[#14293a] px-1.5 py-0.2 font-semibold border border-[#d3d6db] rounded-sm">
                            Size: {item.size}
                          </span>
                        )}
                        <span>Qty: {item.quantity}</span>
                      </div>

                      {ord.status === 'delivered' && (
                        <div className="mt-2">
                          {(() => {
                            const isBolt = ord.order_type === 'bolt_try_on' || ord.delivery_mode === 'try_on'
                            const isRejected = isBolt && ((item as any).is_kept === false || (item as any).try_on_decision === 'rejected')

                            if (isRejected) {
                              return (
                                <span className="text-[10px] text-neutral-400 italic font-mono">
                                  Try-on returned
                                </span>
                              )
                            }

                            const existingReview = userReviewsMap[item.id]
                            if (existingReview) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReviewItem({
                                      id: item.id,
                                      order_id: ord.id,
                                      product_id: item.product_id,
                                      product: item.product,
                                      size: item.size,
                                      is_bolt: isBolt,
                                    })
                                    setSelectedExistingReview(existingReview)
                                    setIsReviewModalOpen(true)
                                  }}
                                  className="text-xs font-sans font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                  <span>Review Submitted ({existingReview.rating}★)</span>
                                </button>
                              )
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReviewItem({
                                    id: item.id,
                                    order_id: ord.id,
                                    product_id: item.product_id,
                                    product: item.product,
                                    size: item.size,
                                    is_bolt: isBolt,
                                  })
                                  setSelectedExistingReview(null)
                                  setIsReviewModalOpen(true)
                                }}
                                className="text-xs font-sans font-semibold text-white bg-[#14293a] hover:bg-[#b91c1c] border border-transparent px-3 py-1 rounded-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              >
                                <Star className="w-3 h-3 fill-white text-white" />
                                <span>Write Review</span>
                              </button>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-xs text-[#14293a]">
                      ₹{Number(item.unit_price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Destination & Logistics Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase text-[#6c7079] font-bold block">
              SHIPPING DESTINATION
            </span>
            <p className="text-[#14293a] leading-relaxed text-xs">
              {ord.shipping_address || 'Address provided at checkout'}
            </p>
          </div>

          <div className="space-y-0.5 sm:border-l sm:border-[#d3d6db] sm:pl-3">
            <span className="text-[10px] uppercase text-[#6c7079] font-bold block">
              LOGISTICS RADAR
            </span>
            <p className="text-[#14293a]">
              Tracking:{' '}
              <span className="text-[#b91c1c] font-bold">
                {ord.tracking_barcode || 'ATL-TRK-PENDING'}
              </span>
            </p>
            <p className="text-[#14293a]">
              Invoice:{' '}
              <span className="text-[#14293a] font-semibold">
                {ord.invoice_number || 'INV-PENDING'}
              </span>
            </p>
          </div>
        </div>

        {/* Order Financial Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-[#e5e7eb] text-xs">
          <span className="uppercase text-[#6c7079] font-bold tracking-wider">
            TOTAL REALIZED
          </span>
          <span className="text-sm font-bold text-[#14293a]">
            ₹{Number(ord.total || ord.original_total || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] pt-4 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1320px] mx-auto space-y-6">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <span className="text-[#14293a]">Your Orders</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              Your Orders
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({orders.length} {orders.length === 1 ? 'order' : 'orders'})
              </span>
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Order tracking &amp; doorstep try-on history</span>
            </div>
          </div>

          {userName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="h-8 px-3 text-xs uppercase text-[#14293a] hover:text-[#b91c1c] border border-[#d3d6db] flex items-center gap-1.5 rounded-sm bg-white cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#6c7079]" />
              <span>Sign Out</span>
            </Button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#d3d6db] gap-6 text-xs uppercase tracking-wider font-semibold">
          <button
            onClick={() => setActiveTab('my_orders')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_orders'
                ? 'border-[#b91c1c] text-[#b91c1c] font-bold'
                : 'border-transparent text-[#6c7079] hover:text-[#14293a]'
            }`}
          >
            My Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('track_guest')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'track_guest'
                ? 'border-[#b91c1c] text-[#b91c1c] font-bold'
                : 'border-transparent text-[#6c7079] hover:text-[#14293a]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Guest Order</span>
          </button>
        </div>

        {/* TAB 1: MY ORDERS */}
        {activeTab === 'my_orders' && (
          <div className="space-y-6">
            {/* Search Filter Bar */}
            {orders.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8a909a] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order reference or garment title..."
                    className="w-full bg-[#f8f8f8] border border-[#d3d6db] rounded-sm pl-9 pr-4 py-2 text-xs text-[#14293a] placeholder:text-[#8a909a] focus:border-[#14293a] focus:outline-none"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#6c7079] hover:text-[#14293a] px-2 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-[#b91c1c] animate-spin mx-auto" />
                <p className="text-xs uppercase tracking-wider text-[#6c7079]">
                  Synchronizing orders with fulfillment atelier...
                </p>
              </div>
            ) : visibleOrders.length > 0 ? (
              <div className="space-y-4">{visibleOrders.map(renderOrderCard)}</div>
            ) : !userName ? (
              <div className="py-14 px-6 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm text-center space-y-4">
                <div className="w-12 h-12 bg-white border border-[#d3d6db] rounded-full flex items-center justify-center mx-auto text-[#14293a]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#14293a]">
                    No Active Session Detected
                  </h2>
                  <p className="text-xs text-[#6c7079] max-w-sm mx-auto leading-relaxed">
                    Sign in to your patron account to view full order history, invoices, and live doorstep try-on appointments.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                  <Link href="/login?callbackUrl=/orders">
                    <Button
                      size="lg"
                      className="px-6 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm transition-colors cursor-pointer"
                    >
                      Sign In to Account →
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setActiveTab('track_guest')}
                    className="px-6 py-2 bg-white text-[#14293a] hover:bg-[#f8f8f8] border border-[#d3d6db] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Track Guest Order
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-14 px-6 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm text-center space-y-4">
                <div className="w-12 h-12 bg-white border border-[#d3d6db] rounded-full flex items-center justify-center mx-auto text-[#14293a]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#14293a]">
                    No Orders on File
                  </h2>
                  <p className="text-xs text-[#6c7079] max-w-sm mx-auto">
                    We could not find any active or past orders associated with this account.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/shop">
                    <Button
                      size="lg"
                      className="px-6 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm transition-colors cursor-pointer"
                    >
                      Explore Collections →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRACK GUEST ORDER */}
        {activeTab === 'track_guest' && (
          <div className="space-y-6">
            <div className="p-6 bg-[#f8f8f8] border border-[#d3d6db] rounded-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#14293a]">
                  Track Guest Order
                </h3>
                <p className="text-xs text-[#6c7079]">
                  Enter your order reference code (e.g. <span className="font-semibold text-[#14293a]">ATL-XXXX</span>) or tracking barcode to inspect live dispatch and doorstep try-on status.
                </p>
              </div>

              <form onSubmit={handleTrackLookup} className="flex gap-2">
                <input
                  type="text"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="e.g. ATL-7ADX2, ATL-TRK-9821..."
                  className="flex-1 bg-white border border-[#d3d6db] rounded-sm px-3.5 py-2 text-xs text-[#14293a] placeholder:text-[#8a909a] focus:border-[#14293a] focus:outline-none"
                />
                <Button
                  type="submit"
                  disabled={trackLoading}
                  className="px-5 py-2 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors disabled:opacity-50"
                >
                  {trackLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Track Order</span>
                  )}
                </Button>
              </form>

              {recentGuestRefs.length > 0 && (
                <div className="pt-2 text-xs">
                  <span className="text-[#6c7079] text-[11px] block mb-1">
                    Recent orders on this device:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recentGuestRefs.map((ref) => (
                      <button
                        key={ref}
                        type="button"
                        onClick={() => {
                          setTrackQuery(ref)
                          handleTrackLookup(undefined, ref)
                        }}
                        className="px-2.5 py-1 bg-white border border-[#d3d6db] hover:border-[#14293a] text-xs font-semibold text-[#14293a] transition-colors cursor-pointer rounded-sm"
                      >
                        {ref} →
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {trackError && (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-sm">
                {trackError}
              </div>
            )}

            {trackResult && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-[#6c7079]">
                  <span className="font-bold text-[#14293a]">
                    Record found for {trackResult.order_number}
                  </span>
                  <button
                    onClick={() => setTrackResult(null)}
                    className="text-[#b91c1c] hover:underline cursor-pointer"
                  >
                    Clear Result
                  </button>
                </div>
                {renderOrderCard(trackResult)}
              </div>
            )}
          </div>
        )}

        <div className="text-center pt-6 border-t border-[#d3d6db]">
          <Link
            href="/shop"
            className="text-xs uppercase tracking-wider text-[#6c7079] hover:text-[#14293a] transition-colors"
          >
            ← Back to Shop Collections
          </Link>
        </div>
      </div>

      {/* Review Garment Modal */}
      <ReviewGarmentModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false)
          setSelectedReviewItem(null)
          setSelectedExistingReview(null)
        }}
        orderItem={selectedReviewItem}
        existingReview={selectedExistingReview}
        onSuccess={() => {
          loadOrders(true)
        }}
      />
    </div>
  )
}
