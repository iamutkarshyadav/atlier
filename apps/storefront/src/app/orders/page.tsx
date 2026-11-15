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
  Search,
  Zap,
  ArrowRight,
  ShieldCheck,
  MapPin,
  ExternalLink,
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

  // Guest lookup & Tab state
  const [activeTab, setActiveTab] = useState<'my_orders' | 'track_guest'>('my_orders')
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResult, setTrackResult] = useState<OrderWithItems | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)
  const [recentGuestRefs, setRecentGuestRefs] = useState<string[]>([])

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

      // Check stored local references for guest patrons
      let storedRefs: string[] = []
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('patron_recent_orders')
          if (stored) storedRefs = JSON.parse(stored)
        }
      } catch {}

      const res = await fetch('/api/orders', { headers })
      const data = await res.json()

      let fetchedOrders: OrderWithItems[] = []
      if (data.success && Array.isArray(data.orders)) {
        fetchedOrders = data.orders
      }

      // If patron has guest orders stored locally and no server orders found yet, fetch them by reference
      if (fetchedOrders.length === 0 && storedRefs.length > 0) {
        const guestPromises = storedRefs.slice(0, 5).map(async (ref) => {
          try {
            const r = await fetch(`/api/orders?reference=${encodeURIComponent(ref)}`)
            const d = await r.json()
            return d.success && Array.isArray(d.orders) && d.orders.length > 0 ? d.orders[0] : null
          } catch {
            return null
          }
        })
        const guestResults = (await Promise.all(guestPromises)).filter(Boolean) as OrderWithItems[]
        if (guestResults.length > 0) {
          fetchedOrders = guestResults
        }
      }

      setOrders(fetchedOrders)
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

  // Handle Guest Lookup
  const handleTrackLookup = async (e?: React.FormEvent, overrideRef?: string) => {
    if (e) e.preventDefault()
    const code = (overrideRef || trackQuery).trim()
    if (!code) return

    setTrackLoading(true)
    setTrackError(null)
    setTrackResult(null)

    try {
      const res = await fetch(`/api/orders?reference=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
        setTrackResult(data.orders[0])
      } else {
        setTrackError(
          `No order record found for "${code}". Please check your order reference number or tracking barcode.`
        )
      }
    } catch {
      setTrackError('Could not synchronize with atelier dispatch radar. Please try again.')
    } finally {
      setTrackLoading(false)
    }
  }

  // Filter orders by search query
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

  // Helper: Status badge
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Order Confirmed</span>
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 border border-blue-300 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Preparing in Atelier</span>
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-900 border border-purple-300 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <Truck className="w-3.5 h-3.5 text-purple-600" />
            <span>Out for Delivery</span>
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivered</span>
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono font-bold tracking-wider uppercase rounded-none">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled & Refunded</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-800 text-xs font-mono font-bold uppercase rounded-none border border-neutral-300">
            <span>{status}</span>
          </span>
        )
    }
  }

  // Visual 4-step progress tracker
  const renderProgressSteps = (status: OrderStatus) => {
    const steps = [
      { key: 'pending', label: 'Order Confirmed' },
      { key: 'processing', label: 'Atelier QC & Prep' },
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
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-mono flex items-center justify-between rounded-none my-3">
          <span>This order has been cancelled and stock allocation restored to the atelier.</span>
          <span className="font-bold uppercase text-rose-700">Voided</span>
        </div>
      )
    }

    return (
      <div className="py-4 border-y border-[#E5E0D8] my-4">
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
                      ? 'bg-[#09090B] text-white ring-4 ring-neutral-200 shadow-md'
                      : 'bg-[#F4F1EA] text-neutral-500 border border-[#E5E0D8]'
                  }`}
                >
                  {isCompleted ? '✓' : stepWeight}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-mono uppercase tracking-wider leading-tight ${
                    isCurrent
                      ? 'font-bold text-[#09090B]'
                      : isCompleted
                      ? 'text-neutral-700 font-medium'
                      : 'text-neutral-400'
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

  // Render Single Order Card
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
        className="bg-[#FAF8F2] border border-[#E5E0D8] rounded-none p-6 sm:p-8 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:border-[#D5CFC5] transition-all"
      >
        {/* Order Card Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#E5E0D8]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-[#09090B] uppercase tracking-wide">
                {ord.order_number || ord.id}
              </span>
              <span className="text-[10px] font-mono bg-[#F2EFE8] text-neutral-800 px-2.5 py-0.5 border border-[#E5E0D8] rounded-none uppercase font-bold flex items-center gap-1">
                {ord.order_type === 'bolt_try_on' || ord.delivery_mode === 'try_on' ? (
                  <>
                    <Zap className="w-3 h-3 fill-amber-600 text-amber-600" /> Bolt ⚡ Try-On Booking
                  </>
                ) : (
                  'Standard Dispatch'
                )}
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">Placed on {orderDate}</p>
          </div>

          <div>{getStatusBadge(ord.status)}</div>
        </div>

        {/* Real-time Visual Progress Stepper */}
        {renderProgressSteps(ord.status)}

        {/* Garment Items List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
            Order Allocations ({items.length})
          </h4>
          <div className="divide-y divide-[#E5E0D8] border-y border-[#E5E0D8]">
            {items.map((item, idx) => {
              const prod = item.product
              return (
                <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-16 bg-[#F4F1EA] relative overflow-hidden shrink-0 border border-[#E5E0D8] rounded-none">
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
                      <h5 className="font-sans text-sm font-bold uppercase tracking-tight text-[#09090B]">
                        {prod?.title || 'Garment Piece'}
                      </h5>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 mt-0.5">
                        {item.size && (
                          <span className="bg-[#F2EFE8] text-neutral-800 px-1.5 py-0.5 font-bold border border-[#E5E0D8] rounded-none">
                            Size {item.size}
                          </span>
                        )}
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#09090B]">
                      ₹{(Number(item.unit_price) * (item.quantity || 1)).toLocaleString('en-IN')}
                    </span>
                    {item.is_kept === true && (
                      <span className="block text-[10px] font-mono text-emerald-600 font-bold uppercase">
                        Kept
                      </span>
                    )}
                    {item.is_kept === false && (
                      <span className="block text-[10px] font-mono text-neutral-500 uppercase">
                        Returned
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Destination & Logistics Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F7F5EE] border border-[#E5E0D8] rounded-none text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-neutral-500 font-bold block">
              SHIPPING DESTINATION
            </span>
            <p className="text-neutral-800 leading-relaxed font-sans text-xs">
              {ord.shipping_address || 'Address provided at checkout'}
            </p>
            {ord.delivery_notes && (
              <p className="text-neutral-500 text-[11px] italic mt-1 font-sans">
                Notes: {ord.delivery_notes}
              </p>
            )}
          </div>

          <div className="space-y-1 sm:border-l sm:border-[#E5E0D8] sm:pl-4">
            <span className="text-[10px] uppercase text-neutral-500 font-bold block">
              LOGISTICS RADAR
            </span>
            <p className="text-neutral-700">
              Tracking:{' '}
              <span className="text-[#B91C1C] font-bold">
                {ord.tracking_barcode || 'ATL-TRK-PENDING'}
              </span>
            </p>
            <p className="text-neutral-700">
              Invoice:{' '}
              <span className="text-[#09090B] font-bold font-mono">
                {ord.invoice_number || 'INV-PENDING'}
              </span>
            </p>
            {ord.delivery_mode === 'try_on' && (
              <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                ✓ 45-Minute Doorstep Try-On Salon Included
              </p>
            )}
          </div>
        </div>

        {/* Order Financial Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-[#E5E0D8] text-xs font-mono">
          <span className="uppercase text-neutral-500 font-bold tracking-wider">
            TOTAL REALIZED
          </span>
          <span className="text-base font-bold text-[#09090B] font-mono">
            ₹{Number(ord.total || ord.original_total || 0).toLocaleString('en-IN')} INR
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-[#09090B] py-10 sm:py-16 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E0D8]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#B91C1C] font-bold block">
              ATELIER CLIENT CARE
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold uppercase text-[#09090B] tracking-tight font-display mt-1">
              PATRON ORDERS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-light mt-1">
              Live tracking and doorstep try-on settlements synchronized with dispatch.
            </p>
          </div>

          {/* User Status & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F2] border border-[#E5E0D8] text-[#B91C1C] text-[11px] font-mono rounded-none">
              <span className="w-2 h-2 rounded-none bg-[#B91C1C] animate-ping" />
              <span>RADAR LIVE</span>
            </div>

            {userName && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="h-9 px-4 text-xs font-mono uppercase text-neutral-700 hover:text-black border border-[#E5E0D8] hover:border-black flex items-center gap-1.5 rounded-none bg-[#FAF8F2] cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-500" />
                <span>Sign Out</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#E5E0D8] gap-8 text-xs font-mono uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('my_orders')}
            className={`pb-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_orders'
                ? 'border-[#B91C1C] text-[#09090B]'
                : 'border-transparent text-neutral-400 hover:text-black'
            }`}
          >
            My Atelier Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('track_guest')}
            className={`pb-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'track_guest'
                ? 'border-[#B91C1C] text-[#09090B]'
                : 'border-transparent text-neutral-400 hover:text-black'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track by Order # / Barcode</span>
          </button>
        </div>

        {/* TAB 1: MY ATELIER ORDERS */}
        {activeTab === 'my_orders' && (
          <div className="space-y-6">
            {/* Authenticated User Status Bar */}
            {userName && (
              <div className="p-4 bg-[#FAF8F2] border border-[#E5E0D8] rounded-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#09090B] text-white rounded-none font-bold flex items-center justify-center text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold uppercase text-[#09090B]">{userName}</p>
                    {userEmail && (
                      <p className="text-neutral-500 text-[11px] font-sans lowercase">{userEmail}</p>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500">
                  <span>
                    {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} linked to account
                  </span>
                </div>
              </div>
            )}

            {/* Search Filter Bar */}
            {orders.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order number or piece title..."
                    className="w-full bg-[#FAF8F2] border border-[#E5E0D8] rounded-none pl-10 pr-4 py-2.5 text-xs text-[#09090B] placeholder:text-neutral-400 font-mono focus:border-black focus:outline-none transition-colors"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-mono text-neutral-500 hover:text-black px-2 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading ? (
              <div className="py-24 text-center space-y-4">
                <RefreshCw className="w-7 h-7 text-[#B91C1C] animate-spin mx-auto" />
                <p className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                  Synchronizing orders with fulfillment atelier...
                </p>
              </div>
            ) : visibleOrders.length > 0 ? (
              /* Orders Manifest */
              <div className="space-y-6">{visibleOrders.map(renderOrderCard)}</div>
            ) : !userName ? (
              /* Unauthenticated Gate with Quick Access to Guest Tracking */
              <div className="py-16 px-6 bg-[#FAF8F2] border border-[#E5E0D8] rounded-none text-center space-y-6 shadow-sm">
                <div className="w-14 h-14 bg-white border border-[#E5E0D8] rounded-none flex items-center justify-center mx-auto text-neutral-600">
                  <ShoppingBag className="w-7 h-7 text-neutral-600" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-display font-bold uppercase tracking-tight text-[#09090B]">
                    No Active Session Detected
                  </h2>
                  <p className="text-xs text-neutral-600 font-light max-w-sm mx-auto leading-relaxed">
                    Sign in to your patron account to view full order history, invoices, and live
                    doorstep try-on settlements.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                  <Link href="/login?callbackUrl=/orders">
                    <Button
                      size="lg"
                      className="px-8 h-12 bg-[#09090B] hover:bg-[#1A1A1A] hover:shadow-[0_4px_24px_rgba(185,28,28,0.35)] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none shadow-sm transition-all cursor-pointer"
                    >
                      Sign In to Account →
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setActiveTab('track_guest')}
                    className="px-8 h-12 bg-white text-[#09090B] hover:bg-[#F4F1EA] border border-[#E5E0D8] font-mono font-bold text-xs uppercase tracking-wider rounded-none transition-all cursor-pointer"
                  >
                    Track Guest Order
                  </Button>
                </div>

                {/* Stored Local References if Available */}
                {recentGuestRefs.length > 0 && (
                  <div className="pt-6 border-t border-[#E5E0D8] text-left">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-2">
                      RECENT ORDERS FROM THIS DEVICE
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {recentGuestRefs.map((ref) => (
                        <button
                          key={ref}
                          onClick={() => {
                            setActiveTab('track_guest')
                            setTrackQuery(ref)
                            handleTrackLookup(undefined, ref)
                          }}
                          className="px-3 py-1.5 bg-white border border-[#E5E0D8] hover:border-black text-xs font-mono font-bold text-[#09090B] transition-colors cursor-pointer"
                        >
                          {ref} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty Orders State for Logged In User */
              <div className="py-20 px-6 bg-[#FAF8F2] border border-[#E5E0D8] rounded-none text-center space-y-6 shadow-sm">
                <div className="w-14 h-14 bg-white border border-[#E5E0D8] rounded-none flex items-center justify-center mx-auto text-neutral-600">
                  <ShoppingBag className="w-7 h-7 text-neutral-600" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-display font-bold uppercase tracking-tight text-[#09090B]">
                    No Orders on File
                  </h2>
                  <p className="text-xs text-neutral-600 font-light max-w-sm mx-auto">
                    We could not find any active or past atelier orders associated with this
                    account.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/shop">
                    <Button
                      size="lg"
                      className="px-8 h-12 bg-[#09090B] hover:bg-[#1A1A1A] hover:shadow-[0_4px_24px_rgba(185,28,28,0.35)] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none shadow-sm transition-all cursor-pointer"
                    >
                      Explore Shop Collections →
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
            <div className="p-6 bg-[#FAF8F2] border border-[#E5E0D8] rounded-none space-y-4">
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold uppercase text-[#09090B]">
                  Live Logistics Dispatch Radar
                </h3>
                <p className="text-xs text-neutral-500 font-light">
                  Enter your order reference code (e.g.{' '}
                  <span className="font-mono text-black font-semibold">ATL-7ADX2</span> or{' '}
                  <span className="font-mono text-black font-semibold">ATL-ORD-9821</span>) or
                  tracking barcode to inspect live dispatch and Doorstep Try-On status.
                </p>
              </div>

              <form onSubmit={handleTrackLookup} className="flex gap-3">
                <input
                  type="text"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="e.g. ATL-7ADX2, ATL-TRK-9821..."
                  className="flex-1 bg-white border border-[#E5E0D8] rounded-none px-4 py-3 text-xs text-[#09090B] placeholder:text-neutral-400 font-mono focus:border-black focus:outline-none transition-colors"
                />
                <Button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 h-11 bg-[#09090B] hover:bg-[#1A1A1A] hover:shadow-[0_4px_24px_rgba(185,28,28,0.35)] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer transition-all disabled:opacity-50"
                >
                  {trackLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Track Order</span>
                  )}
                </Button>
              </form>

              {/* Stored Recent Orders Pills */}
              {recentGuestRefs.length > 0 && (
                <div className="pt-2 text-xs font-mono">
                  <span className="text-neutral-400 text-[11px] block mb-1">
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
                        className="px-2.5 py-1 bg-white border border-[#E5E0D8] hover:border-black text-[11px] font-mono text-[#09090B] transition-colors cursor-pointer"
                      >
                        {ref}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Feedback */}
            {trackError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono rounded-none">
                {trackError}
              </div>
            )}

            {/* Lookup Result Order Card */}
            {trackResult && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                  <span className="uppercase font-bold text-black">
                    Live Record Found for {trackResult.order_number}
                  </span>
                  <button
                    onClick={() => setTrackResult(null)}
                    className="text-neutral-400 hover:text-black underline cursor-pointer"
                  >
                    Clear Result
                  </button>
                </div>
                {renderOrderCard(trackResult)}
              </div>
            )}
          </div>
        )}

        {/* Back to Catalogue */}
        <div className="text-center pt-8 border-t border-[#E5E0D8]">
          <Link
            href="/shop"
            className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
          >
            ← Back to Shop Collections
          </Link>
        </div>
      </div>
    </div>
  )
}
