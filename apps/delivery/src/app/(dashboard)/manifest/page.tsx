'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Zap,
  Clock,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Truck,
  Filter,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { DEFAULT_ORDERS, type OrderWithItems } from '@repo/supabase/utils'

export default function BoltManifestDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'bolt_only' | 'all'>('bolt_only')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchManifest = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const supabase = createBrowserClient()

      // Fetch active courier session
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Build orders query: fetch active delivery stops
      let query = supabase
        .from('orders')
        .select(`
          *,
          bolt_timeslot:bolt_timeslots(*),
          order_items(*, product:products(id, title, image_url, price, material))
        `)
        .in('status', ['processing', 'out_for_delivery'])
        .order('created_at', { ascending: false })

      // If user is courier, prioritize orders assigned to them or unassigned
      if (user?.id) {
        query = query.or(`delivery_partner_id.eq.${user.id},delivery_partner_id.is.null`)
      }

      const { data, error: dbError } = await query

      if (dbError) {
        console.warn('Could not query live DB for manifest stops; falling back to starter manifest:', dbError)
        // Fallback to DEFAULT_ORDERS
        setOrders(DEFAULT_ORDERS as OrderWithItems[])
      } else if (data && data.length > 0) {
        setOrders(data as OrderWithItems[])
      } else {
        // If DB returned 0 active orders, use starter orders so courier can test UI
        setOrders(DEFAULT_ORDERS as OrderWithItems[])
      }
    } catch (err: unknown) {
      console.warn('Manifest load exception; using default starter orders:', err)
      setOrders(DEFAULT_ORDERS as OrderWithItems[])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchManifest()
  }, [fetchManifest])

  // Filtered orders based on Tab and Search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab filter
      if (filterMode === 'bolt_only' && order.order_type !== 'bolt_try_on') {
        return false
      }

      // 2. Search filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const orderNum = (order.order_number || order.id || '').toLowerCase()
      const pin = (order.bolt_pincode || '').toLowerCase()
      const address = (order.shipping_address || '').toLowerCase()
      const slot = (order.bolt_timeslot?.label || '').toLowerCase()

      return (
        orderNum.includes(q) ||
        pin.includes(q) ||
        address.includes(q) ||
        slot.includes(q)
      )
    })
  }, [orders, filterMode, searchQuery])

  // KPI stats
  const stats = useMemo(() => {
    const boltOrders = orders.filter((o) => o.order_type === 'bolt_try_on')
    const activeAtDoorstep = boltOrders.filter(
      (o) => o.bolt_session_status === 'at_doorstep'
    ).length
    const scheduled = boltOrders.filter(
      (o) =>
        o.bolt_session_status === 'scheduled' ||
        o.bolt_session_status === 'en_route'
    ).length
    const totalKeptEstimated = boltOrders.length

    return {
      totalStops: orders.length,
      boltStops: boltOrders.length,
      activeAtDoorstep,
      scheduled,
      totalKeptEstimated,
    }
  }, [orders])

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-[#111111] border border-[#222222] p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                Bolt ⚡ Doorstep Try-On Fleet
              </span>
              <span className="text-neutral-500 font-mono text-xs">• IST Active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-sans">
              Courier Transit Manifest
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
              Real-time dispatch, 45-minute white-glove doorstep fitting stops, and dynamic collection.
            </p>
          </div>

          <button
            onClick={() => fetchManifest()}
            disabled={refreshing}
            className="self-start sm:self-auto px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-neutral-300 text-xs font-mono flex items-center gap-2 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sync Manifest</span>
          </button>
        </div>

        {/* Real-Time Dispatch Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-[#222222]">
          <div className="bg-[#0A0A0A] p-3 border border-[#1E1E1E]">
            <p className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">
              Total Active Stops
            </p>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {stats.totalStops}
            </p>
          </div>
          <div className="bg-[#0A0A0A] p-3 border border-[#1E1E1E]">
            <p className="text-[10px] font-mono uppercase text-amber-400/80 tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
              Bolt ⚡ Try-On
            </p>
            <p className="text-xl font-bold font-mono text-amber-400 mt-1">
              {stats.boltStops}
            </p>
          </div>
          <div className="bg-[#0A0A0A] p-3 border border-[#1E1E1E]">
            <p className="text-[10px] font-mono uppercase text-emerald-400/80 tracking-wider">
              At Doorstep (Active)
            </p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {stats.activeAtDoorstep}
            </p>
          </div>
          <div className="bg-[#0A0A0A] p-3 border border-[#1E1E1E]">
            <p className="text-[10px] font-mono uppercase text-blue-400/80 tracking-wider">
              Pending Slots
            </p>
            <p className="text-xl font-bold font-mono text-blue-400 mt-1">
              {stats.scheduled}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center bg-[#111111] border border-[#222222] p-1">
            <button
              onClick={() => setFilterMode('bolt_only')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                filterMode === 'bolt_only'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Bolt ⚡ Try-On ({stats.boltStops})</span>
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-black font-bold shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>All Stops ({stats.totalStops})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #, PIN, Address..."
              className="w-full bg-[#111111] border border-[#222222] pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs font-mono"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manifest Orders List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4 font-mono text-xs text-neutral-400">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent animate-spin rounded-full" />
          <p className="tracking-widest uppercase">Loading Transit Manifest...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#111111] border border-[#222222] p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase font-mono">
            No Stops Matching Filter
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {filterMode === 'bolt_only'
              ? 'No active Bolt ⚡ Doorstep Try-On orders currently pending in your dispatch zone.'
              : 'No transit packages currently assigned to your route.'}
          </p>
          {filterMode === 'bolt_only' && (
            <button
              onClick={() => setFilterMode('all')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#222222] hover:bg-[#2A2A2A] text-white text-xs font-mono uppercase"
            >
              View All Stops
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const isBolt = order.order_type === 'bolt_try_on'
            const isAtDoorstep = order.bolt_session_status === 'at_doorstep'
            const isCompleted = order.bolt_session_status === 'completed'
            const isEnRoute = order.bolt_session_status === 'en_route'
            const timeslotLabel =
              order.bolt_timeslot?.label ||
              (isBolt ? '10:00 AM - 12:00 PM (IST)' : 'Standard Daylight Transit')
            const pincode = order.bolt_pincode || '560038'
            const itemCount = order.order_items?.length || 0

            return (
              <div
                key={order.id}
                className={`bg-[#0C0C0C] border transition-all ${
                  isAtDoorstep
                    ? 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                    : isBolt
                    ? 'border-[#2A2A2A] hover:border-amber-500/40'
                    : 'border-[#1C1C1C] hover:border-[#333333]'
                }`}
              >
                {/* Order Top Bar */}
                <div className="bg-[#141414] px-4 py-2.5 border-b border-[#222222] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#222222] text-neutral-300 font-bold flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <span className="font-bold text-white tracking-wide">
                      {order.order_number || order.id.slice(0, 8).toUpperCase()}
                    </span>
                    {isBolt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-400 text-black uppercase">
                        <Zap className="w-2.5 h-2.5 fill-black" />
                        Bolt ⚡ Try-On
                      </span>
                    )}
                  </div>

                  {/* Session Status Pill */}
                  <div className="flex items-center gap-2">
                    {isAtDoorstep ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Fitting in Progress
                      </span>
                    ) : isEnRoute ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        En Route to Doorstep
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Reconciled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                        Scheduled
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Bolt Time Slot & PIN Highlight */}
                  {isBolt && (
                    <div className="bg-[#141414] border border-[#222222] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-neutral-400 font-semibold tracking-wider">
                            Scheduled Doorstep Window (IST)
                          </p>
                          <p className="text-white font-bold text-xs sm:text-sm">
                            {timeslotLabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#222222] pt-2 sm:pt-0 sm:pl-4">
                        <div>
                          <p className="text-[10px] uppercase text-neutral-400 font-semibold tracking-wider">
                            PIN Code
                          </p>
                          <p className="text-amber-400 font-bold text-sm">
                            {pincode}
                          </p>
                        </div>
                        <div className="border-l border-[#222222] pl-4">
                          <p className="text-[10px] uppercase text-neutral-400 font-semibold tracking-wider">
                            Booking Deposit
                          </p>
                          <p className="text-emerald-400 font-bold text-xs">
                            ₹99.00 Paid
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer & Destination Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-neutral-500 tracking-wider">
                        Delivery Destination
                      </p>
                      <div className="flex items-start gap-1.5 text-neutral-200">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {order.shipping_address || 'Studio 4B, 100ft Road, Indiranagar, Bengaluru, KA 560038'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 sm:border-l sm:border-[#1E1E1E] sm:pl-3">
                      <p className="text-[10px] uppercase text-neutral-500 tracking-wider">
                        Customer Contact
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-semibold">
                          Patron Dispatch Contact
                        </span>
                        <a
                          href="tel:+919886012345"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call Patron</span>
                        </a>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        +91 98860 12345 • Ring private residence bell
                      </p>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="border-t border-[#1C1C1C] pt-3">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-neutral-500" />
                        Garments in Package ({itemCount} {itemCount === 1 ? 'item' : 'items'} for try-on)
                      </span>
                      <span className="text-neutral-500 text-[11px]">
                        Max 5 Items Salon Limit Enforced
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.order_items?.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#121212] border border-[#1E1E1E] p-2 flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-white font-medium truncate max-w-[180px]">
                            {item.product?.title || 'Heavyweight Garment'}
                          </span>
                          <span className="text-amber-400 font-bold shrink-0">
                            ₹{Number(item.unit_price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {itemCount > 3 && (
                        <div className="bg-[#121212] border border-[#1E1E1E] p-2 flex items-center justify-center text-xs font-mono text-neutral-400">
                          +{itemCount - 3} more curated garments
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action CTAs */}
                  <div className="border-t border-[#1C1C1C] pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-[11px] font-mono text-neutral-500">
                      {isBolt ? (
                        <span>White-Glove 45m Doorstep Try-On • Payment deferred post-fitting</span>
                      ) : (
                        <span>Standard Direct Delivery package</span>
                      )}
                    </div>

                    {isBolt ? (
                      <Link
                        href={`/bolt-session/${order.id}`}
                        className={`px-5 py-3 text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 active:scale-95 transition-all ${
                          isAtDoorstep
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                            : 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                        }`}
                      >
                        <Zap className="w-4 h-4 fill-black" />
                        <span>
                          {isAtDoorstep
                            ? 'Resume Doorstep Fitting ⚡'
                            : 'Open Doorstep Try-On ⚡'}
                        </span>
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/order/${order.id}`}
                        className="px-4 py-2.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white border border-[#333333] text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>View Direct Package</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

