'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Zap, Package, X, ArrowRight, BellRing } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'

interface NewOrderNotification {
  id: string
  orderNumber: string
  total: number
  orderType: string
  createdAt: string
  shippingAddress?: string
}

/**
 * Synthesizes a luxury 3-tone chime via Web Audio API.
 * Pure native browser audio synthesis with zero external dependencies.
 */
function playLuxuryOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime
    const notes = [
      { freq: 587.33, start: 0.0, duration: 0.12 }, // D5
      { freq: 880.0, start: 0.1, duration: 0.14 },  // A5
      { freq: 1174.66, start: 0.22, duration: 0.38 }, // D6
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + duration)
    })
  } catch {
    // Gracefully handle browsers blocking unprompted audio context
  }
}

export function NewOrderNotifier() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NewOrderNotification[]>([])
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const isInitialMountRef = useRef(true)

  const triggerNotification = useCallback((order: any) => {
    if (!order?.id || knownOrderIdsRef.current.has(order.id)) return

    knownOrderIdsRef.current.add(order.id)

    // Skip playing chime or showing popup during initial batch hydration
    if (isInitialMountRef.current) return

    const newNotif: NewOrderNotification = {
      id: order.id,
      orderNumber: order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      total: Number(order.total) || 0,
      orderType: order.order_type || 'standard',
      createdAt: order.created_at || new Date().toISOString(),
      shippingAddress: order.shipping_address || undefined,
    }

    playLuxuryOrderChime()

    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)])

    // Auto-dismiss after 9 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id))
    }, 9000)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient()

    // 1. Initial hydration: record existing order IDs so we only alert on truly new orders
    async function initKnownOrders() {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(20)

        if (data && Array.isArray(data)) {
          data.forEach((ord) => knownOrderIdsRef.current.add(ord.id))
        }
      } catch {
        // Fallback
      } finally {
        isInitialMountRef.current = false
      }
    }

    initKnownOrders()

    // 2. Realtime WebSocket subscription to PostgreSQL INSERT events on public.orders
    const channel = supabase
      .channel('atelier_global_order_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.new) {
            triggerNotification(payload.new)
          }
        }
      )
      .subscribe()

    // 3. Resilient Poller: check every 5 seconds for newly inserted orders
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, total, order_type, shipping_address, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        if (data && Array.isArray(data)) {
          // Process oldest first to preserve natural sequence
          const candidates = [...data].reverse()
          for (const ord of candidates) {
            if (!knownOrderIdsRef.current.has(ord.id) && !isInitialMountRef.current) {
              triggerNotification(ord)
            }
            knownOrderIdsRef.current.add(ord.id)
          }
        }
      } catch {
        // Silent poller catch
      }
    }, 5000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [triggerNotification])

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const navigateToOrders = (orderId: string) => {
    dismiss(orderId)
    router.push('/orders')
  }

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {notifications.map((notif) => {
          const isBolt =
            notif.orderType === 'bolt_try_on' || notif.orderType?.includes('try_on')

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto relative overflow-hidden bg-zinc-950/95 backdrop-blur-md border border-amber-500/40 shadow-2xl shadow-black/80 p-4 text-zinc-100 rounded-none"
            >
              {/* Gold Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-none bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                        New Order Received
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    </div>
                    <div className="text-sm font-mono font-bold text-white tracking-wide mt-0.5">
                      {notif.orderNumber}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => dismiss(notif.id)}
                  className="text-zinc-400 hover:text-white transition-colors p-1"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Order Meta details */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                <div>
                  {isBolt ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase">
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      Bolt Doorstep Try-On
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase">
                      <Package className="w-3 h-3 text-blue-400" />
                      Standard White-Glove
                    </span>
                  )}
                </div>

                <div className="text-base font-bold text-white font-mono">
                  {notif.total > 0 ? `₹${notif.total.toLocaleString()}` : 'Authorized'}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3">
                <button
                  onClick={() => navigateToOrders(notif.id)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-mono font-semibold py-2 px-3 transition-colors uppercase tracking-wider group"
                >
                  <span>Open in Orders Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Progress bar auto-dismiss indicator */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 9, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-[2px] bg-amber-400/60"
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
