'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  Sparkles,
  LogOut,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { Button, Badge } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import type { OrderWithItems, OrderStatus } from '@repo/supabase/types'

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [filterEmail, setFilterEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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
        setFilterEmail(session.user.email || '')
      }
    })
  }, [])

  // 2. Fetch customer orders
  const loadOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const res = await fetch('/api/orders')
      const data = await res.json()

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders)
      }
    } catch (err) {
      console.warn('Orders fetch note:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOrders(false)

    // 3. 3-Second Live Polling Sync with Admin Portal
    const interval = setInterval(() => {
      loadOrders(true)
    }, 3000)

    // 4. Supabase Postgres Realtime Subscription for instantaneous updates
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('customer_orders_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadOrders(true)
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [loadOrders])

  // Handle Logout
  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    setUserEmail(null)
    setUserName(null)
    setUserId(null)
    router.push('/')
    router.refresh()
  }

  // Filter orders for the current user if logged in
  const visibleOrders = orders.filter((o) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = o.order_number?.toLowerCase().includes(q)
      const matchTrack = o.tracking_barcode?.toLowerCase().includes(q)
      const matchProd = o.order_items?.some((i) => i.product?.title?.toLowerCase().includes(q))
      if (matchNum || matchTrack || matchProd) return true
    }

    if (userEmail) {
      const matchesEmail =
        (o.user as any)?.email?.toLowerCase() === userEmail.toLowerCase() ||
        (o.shipping_address && o.shipping_address.toLowerCase().includes(userEmail.toLowerCase())) ||
        (userId && o.user_id === userId)
      return matchesEmail
    }

    return true
  })

  // Helper: Status label and badge
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-bold tracking-wider uppercase">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Order Confirmed</span>
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-bold tracking-wider uppercase">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Preparing in Atelier</span>
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[#166534] border border-emerald-300 text-xs font-mono font-bold tracking-wider uppercase">
            <Truck className="w-3.5 h-3.5 text-[#166534] animate-bounce" />
            <span>Out for Delivery</span>
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 text-white border border-black text-xs font-mono font-bold tracking-wider uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Delivered</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-xs font-mono font-bold tracking-wider uppercase">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled & Refunded</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-800 text-xs font-mono font-bold uppercase">
            <span>{status}</span>
          </span>
        )
    }
  }

  // Helper: Visual 4-step progress tracker
  const renderProgressSteps = (status: OrderStatus) => {
    const steps = [
      { key: 'pending', label: 'Order Confirmed' },
      { key: 'processing', label: 'Preparing & QC' },
      { key: 'out_for_delivery', label: 'Out for Delivery' },
      { key: 'delivered', label: 'Delivered' },
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
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center justify-between">
          <span>This order has been cancelled and inventory allocations restored.</span>
          <span className="font-bold uppercase">Voided</span>
        </div>
      )
    }

    return (
      <div className="py-4 border-y border-neutral-100 my-4">
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => {
            const stepWeight = idx + 1
            const isCompleted = currentWeight > stepWeight
            const isCurrent = currentWeight === stepWeight

            return (
              <div key={step.key} className="flex flex-col items-center text-center space-y-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#166534] text-white'
                      : isCurrent
                      ? 'bg-black text-white ring-4 ring-neutral-200'
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                  }`}
                >
                  {isCompleted ? '✓' : stepWeight}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-mono uppercase tracking-wider leading-tight ${
                    isCurrent ? 'font-bold text-black' : isCompleted ? 'text-neutral-700' : 'text-neutral-400'
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0C] py-10 sm:py-16 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-200">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#166534] font-bold block">
              ATELIER CLIENT CARE
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-light text-black tracking-tight mt-1">
              My Orders
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-light mt-1">
              Live tracking and doorstep try-on settlements synchronized with dispatch.
            </p>
          </div>

          {/* User Status & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-[#166534] text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-ping" />
              <span>LIVE TRACKING</span>
            </div>

            {userName && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="h-9 px-3 text-xs font-mono uppercase text-neutral-700 hover:text-black border-neutral-300 hover:border-black flex items-center gap-1.5 rounded-none"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-500" />
                <span>Log Out</span>
              </Button>
            )}
          </div>
        </div>

        {/* User Card if Authenticated */}
        {userName && (
          <div className="p-4 bg-white border border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black text-[#166534] font-bold flex items-center justify-center text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold uppercase text-black">{userName}</p>
                {userEmail && <p className="text-neutral-500 text-[11px] font-sans lowercase">{userEmail}</p>}
              </div>
            </div>
            <div className="text-[11px] text-neutral-400">
              <span>{visibleOrders.length} {visibleOrders.length === 1 ? 'Order' : 'Orders'} on record</span>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or garment name..."
            className="flex-1 bg-white border border-neutral-300 px-4 py-2.5 text-xs text-black placeholder:text-neutral-400 font-mono focus:border-black focus:outline-none shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-mono text-neutral-500 hover:text-black px-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-7 h-7 text-[#166534] animate-spin mx-auto" />
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-500">
              Synchronizing orders with fulfillment atelier...
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          /* Empty Orders State */
          <div className="py-20 px-6 bg-white border border-neutral-200 text-center space-y-6 shadow-sm">
            <div className="w-14 h-14 bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
              <ShoppingBag className="w-7 h-7 text-neutral-400" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-serif text-black">No Orders on File</h2>
              <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto">
                {userEmail
                  ? `We could not find any orders associated with ${userEmail}.`
                  : 'You have not placed any orders during this session yet.'}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/#collection">
                <Button
                  size="lg"
                  className="px-8 h-12 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none"
                >
                  Explore Collection →
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Order Cards Manifest */
          <div className="space-y-6">
            {visibleOrders.map((ord) => {
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
                  className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-6 shadow-sm hover:border-neutral-400 transition-colors"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-neutral-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-black uppercase">
                          {ord.order_number || ord.id}
                        </span>
                        <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 border border-neutral-200">
                          {ord.delivery_mode === 'try_on' ? 'Try-On Booking' : 'Direct Dispatch'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400">Placed on {orderDate}</p>
                    </div>

                    <div>{getStatusBadge(ord.status)}</div>
                  </div>

                  {/* Real-time Visual Progress Stepper */}
                  {renderProgressSteps(ord.status)}

                  {/* Garment Items List */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                      Order Items ({items.length})
                    </h4>
                    <div className="divide-y divide-neutral-100">
                      {items.map((item, idx) => {
                        const prod = item.product
                        return (
                          <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-16 bg-neutral-100 relative overflow-hidden shrink-0 border border-neutral-200">
                                {prod?.image_url ? (
                                  <Image
                                    src={prod.image_url}
                                    alt={prod.title || 'Piece'}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-serif text-sm font-medium text-black">
                                  {prod?.title || 'Garment Piece'}
                                </h5>
                                <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 mt-0.5">
                                  {item.size && (
                                    <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 font-bold border border-neutral-200">
                                      Size {item.size}
                                    </span>
                                  )}
                                  <span>Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-black">
                                ${(Number(item.unit_price) * (item.quantity || 1)).toFixed(2)}
                              </span>
                              {item.is_kept === true && (
                                <span className="block text-[10px] font-mono text-emerald-600 font-bold">
                                  Kept
                                </span>
                              )}
                              {item.is_kept === false && (
                                <span className="block text-[10px] font-mono text-neutral-400">
                                  Returned
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Destination & Try-On Window Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#FBFBFA] border border-neutral-200 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                        SHIPPING ADDRESS
                      </span>
                      <p className="text-neutral-700 leading-relaxed font-sans text-xs">
                        {ord.shipping_address || 'Address provided at checkout'}
                      </p>
                      {ord.delivery_notes && (
                        <p className="text-neutral-500 text-[11px] italic mt-1 font-sans">
                          Notes: {ord.delivery_notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 sm:border-l sm:border-neutral-200 sm:pl-4">
                      <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                        LOGISTICS REFERENCE
                      </span>
                      <p className="text-neutral-700">
                        Tracking: <span className="text-[#166534] font-bold">{ord.tracking_barcode || 'ATL-TRK-PENDING'}</span>
                      </p>
                      <p className="text-neutral-700">
                        Invoice: <span className="text-neutral-900 font-bold">{ord.invoice_number || 'INV-PENDING'}</span>
                      </p>
                      {ord.delivery_mode === 'try_on' && (
                        <p className="text-xs text-[#166534] font-semibold mt-1">
                          ✓ 45-Minute Doorstep Fitting Session Included
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Financial Footer */}
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-100 text-xs font-mono">
                    <span className="uppercase text-neutral-500 font-bold tracking-wider">
                      TOTAL REALIZED
                    </span>
                    <span className="text-base font-bold text-black">
                      ${Number(ord.total || ord.original_total || 0).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Back to Shopping */}
        <div className="text-center pt-8">
          <Link
            href="/#collection"
            className="text-xs font-mono uppercase tracking-widest text-neutral-600 hover:text-black transition-colors"
          >
            ← Back to Apparel Drop
          </Link>
        </div>
      </div>
    </div>
  )
}
