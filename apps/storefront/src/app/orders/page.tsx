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
  LogOut,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@repo/ui'
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

  // Filter orders strictly for the current authenticated user
  const visibleOrders = (!userEmail || !userId)
    ? []
    : orders.filter((o) => {
        const matchesUser =
          (userId && o.user_id === userId) ||
          (o.user as any)?.email?.toLowerCase() === userEmail.toLowerCase() ||
          (o.shipping_address && o.shipping_address.toLowerCase().includes(userEmail.toLowerCase()))

        if (!matchesUser) return false

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchNum = o.order_number?.toLowerCase().includes(q)
          const matchTrack = o.tracking_barcode?.toLowerCase().includes(q)
          const matchProd = o.order_items?.some((i) => i.product?.title?.toLowerCase().includes(q))
          return Boolean(matchNum || matchTrack || matchProd)
        }

        return true
      })

  // Helper: Status label and badge
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Order Confirmed</span>
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-950/40 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span>Preparing in Atelier</span>
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/40 text-red-300 border border-[#B91C1C]/40 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <Truck className="w-3.5 h-3.5 text-[#B91C1C] animate-bounce" />
            <span>Out for Delivery</span>
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A1B1D] text-white border border-white/20 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Delivered</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Cancelled & Refunded</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A1B1D] text-neutral-300 text-xs font-mono font-bold uppercase rounded-none border border-white/10">
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
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between rounded-none">
          <span>This order has been cancelled and inventory allocations restored.</span>
          <span className="font-bold uppercase">Voided</span>
        </div>
      )
    }

    return (
      <div className="py-4 border-y border-white/10 my-4">
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => {
            const stepWeight = idx + 1
            const isCompleted = currentWeight > stepWeight
            const isCurrent = currentWeight === stepWeight

            return (
              <div key={step.key} className="flex flex-col items-center text-center space-y-1.5">
                <div
                  className={`w-7 h-7 rounded-none flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#B91C1C] text-white'
                      : isCurrent
                      ? 'bg-white text-black ring-4 ring-white/20'
                      : 'bg-[#1A1B1D] text-neutral-500 border border-white/10'
                  }`}
                >
                  {isCompleted ? '✓' : stepWeight}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-mono uppercase tracking-wider leading-tight ${
                    isCurrent ? 'font-bold text-white' : isCompleted ? 'text-neutral-300' : 'text-neutral-500'
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
    <div className="min-h-screen bg-[#212121] text-white py-10 sm:py-16 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#B91C1C] font-bold block">
              ATELIER CLIENT CARE
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold uppercase text-white tracking-tight font-display mt-1">
              MY ORDERS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-light mt-1">
              Live tracking and doorstep try-on settlements synchronized with dispatch.
            </p>
          </div>

          {/* User Status & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1B1D] border border-white/10 text-[#B91C1C] text-[11px] font-mono rounded-none">
              <span className="w-2 h-2 rounded-none bg-[#B91C1C] animate-ping" />
              <span>LIVE TRACKING</span>
            </div>

            {userName && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="h-9 px-4 text-xs font-mono uppercase text-neutral-300 hover:text-white border border-white/15 hover:border-white/30 flex items-center gap-1.5 rounded-none bg-[#1A1B1D] cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                <span>Log Out</span>
              </Button>
            )}
          </div>
        </div>

        {/* User Card if Authenticated */}
        {userName && (
          <div className="p-4 bg-[#262629] border border-white/10 rounded-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1A1B1D] border border-white/10 rounded-none text-[#B91C1C] font-bold flex items-center justify-center text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold uppercase text-white">{userName}</p>
                {userEmail && <p className="text-neutral-400 text-[11px] font-sans lowercase">{userEmail}</p>}
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
            className="flex-1 bg-[#1A1B1D] border border-white/10 rounded-none px-5 py-2.5 text-xs text-white placeholder:text-neutral-500 font-mono focus:border-white/30 focus:outline-none shadow-md transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-mono text-neutral-400 hover:text-white px-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <RefreshCw className="w-7 h-7 text-[#B91C1C] animate-spin mx-auto" />
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Synchronizing orders with fulfillment atelier...
            </p>
          </div>
        ) : !userEmail ? (
          /* Unauthenticated Gate */
          <div className="py-20 px-6 bg-[#262629] border border-white/10 rounded-none text-center space-y-6 shadow-xl">
            <div className="w-14 h-14 bg-[#1A1B1D] border border-white/10 rounded-none flex items-center justify-center mx-auto text-neutral-300">
              <ShoppingBag className="w-7 h-7 text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">Please Log In</h2>
              <p className="text-xs text-neutral-400 font-light max-w-sm mx-auto">
                Sign in to your patron account to view your verified orders, invoices, and live delivery status.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/login?callbackUrl=/orders">
                <Button
                  size="lg"
                  className="px-8 h-12 bg-[#38393D] hover:bg-[#4A4B50] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-white/15 shadow-xl transition-all cursor-pointer"
                >
                  Sign In to View Orders →
                </Button>
              </Link>
            </div>
          </div>
        ) : visibleOrders.length === 0 ? (
          /* Empty Orders State */
          <div className="py-20 px-6 bg-[#262629] border border-white/10 rounded-none text-center space-y-6 shadow-xl">
            <div className="w-14 h-14 bg-[#1A1B1D] border border-white/10 rounded-none flex items-center justify-center mx-auto text-neutral-300">
              <ShoppingBag className="w-7 h-7 text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-display font-bold uppercase tracking-tight text-white">No Orders on File</h2>
              <p className="text-xs text-neutral-400 font-light max-w-sm mx-auto">
                We could not find any active or past orders associated with your account.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/#collection">
                <Button
                  size="lg"
                  className="px-8 h-12 bg-[#38393D] hover:bg-[#4A4B50] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-white/15 shadow-xl transition-all cursor-pointer"
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
                  className="bg-[#262629] border border-white/10 rounded-none p-6 sm:p-8 space-y-6 shadow-xl hover:border-white/20 transition-colors"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/10">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white uppercase">
                          {ord.order_number || ord.id}
                        </span>
                        <span className="text-[10px] font-mono bg-[#1A1B1D] text-neutral-300 px-2.5 py-0.5 border border-white/10 rounded-none uppercase font-bold">
                          {ord.order_type === 'bolt_try_on' || ord.delivery_mode === 'try_on'
                            ? 'Bolt ⚡ Try-On Booking'
                            : 'Standard Dispatch'}
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
                    <div className="divide-y divide-white/10">
                      {items.map((item, idx) => {
                        const prod = item.product
                        return (
                          <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-16 bg-[#1A1B1D] relative overflow-hidden shrink-0 border border-white/10 rounded-none">
                                {prod?.image_url ? (
                                  <Image
                                    src={prod.image_url}
                                    alt={prod.title || 'Piece'}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-sans text-sm font-bold uppercase tracking-tight text-white">
                                  {prod?.title || 'Garment Piece'}
                                </h5>
                                <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400 mt-0.5">
                                  {item.size && (
                                    <span className="bg-[#1A1B1D] text-neutral-300 px-1.5 py-0.5 font-bold border border-white/10 rounded-none">
                                      Size {item.size}
                                    </span>
                                  )}
                                  <span>Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-white">
                                ₹{(Number(item.unit_price) * (item.quantity || 1)).toLocaleString('en-IN')}
                              </span>
                              {item.is_kept === true && (
                                <span className="block text-[10px] font-mono text-emerald-400 font-bold uppercase">
                                  Kept
                                </span>
                              )}
                              {item.is_kept === false && (
                                <span className="block text-[10px] font-mono text-neutral-400 uppercase">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#1A1B1D] border border-white/10 rounded-none text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                        SHIPPING ADDRESS
                      </span>
                      <p className="text-neutral-300 leading-relaxed font-sans text-xs">
                        {ord.shipping_address || 'Address provided at checkout'}
                      </p>
                      {ord.delivery_notes && (
                        <p className="text-neutral-400 text-[11px] italic mt-1 font-sans">
                          Notes: {ord.delivery_notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
                      <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                        LOGISTICS REFERENCE
                      </span>
                      <p className="text-neutral-300">
                        Tracking: <span className="text-[#B91C1C] font-bold">{ord.tracking_barcode || 'ATL-TRK-PENDING'}</span>
                      </p>
                      <p className="text-neutral-300">
                        Invoice: <span className="text-white font-bold">{ord.invoice_number || 'INV-PENDING'}</span>
                      </p>
                      {ord.delivery_mode === 'try_on' && (
                        <p className="text-xs text-emerald-400 font-semibold mt-1">
                          ✓ 45-Minute Doorstep Fitting Session Included
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Financial Footer */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs font-mono">
                    <span className="uppercase text-neutral-400 font-bold tracking-wider">
                      TOTAL REALIZED
                    </span>
                    <span className="text-base font-bold text-white font-mono">
                      ₹{Number(ord.total || ord.original_total || 0).toLocaleString('en-IN')} INR
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
            className="text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            ← Back to Apparel Drop
          </Link>
        </div>
      </div>
    </div>
  )
}
