'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import {
  MapPin,
  Clock,
  Phone,
  Package,
  Check,
  Navigation,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Truck,
  Scan,
  Camera,
  X,
  Search,
  AlertCircle,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { updateOrderStatus, getAllOrders } from '@repo/supabase/utils'
import type { DeliveryMode, TryOnStatus, OrderStatus } from '@repo/supabase/types'

export interface DeliveryTask {
  id: string
  orderNumber: string
  trackingBarcode?: string
  stopNumber: number
  customerName: string
  customerPhone: string
  address: string
  items: string
  notes: string
  total: number
  status: OrderStatus
  deliveryMode: DeliveryMode
  tryOnStatus?: TryOnStatus | null
  scheduledSlot?: string
  eta: string
}

const FALLBACK_TASKS: DeliveryTask[] = [
  {
    id: 'ATL-ORD-9821',
    orderNumber: 'ATL-ORD-9821',
    trackingBarcode: 'ATL-TRK-9821',
    stopNumber: 1,
    customerName: 'Eleanor Vance',
    customerPhone: '+1 (415) 555-0192',
    address: '742 Evergreen Terrace, Studio 4B, San Francisco, CA 94107',
    items: '3x Curated Works [Linen Smock (Taille 02), Sandstone Vessel, Alabaster Pendant]',
    notes: 'Please ring bell 4B or coordinate with private courtyard concierge.',
    total: 845.0,
    status: 'out_for_delivery',
    deliveryMode: 'try_on',
    tryOnStatus: 'pending',
    scheduledSlot: 'Today • 15:00 – 15:45 (Doorstep Salon)',
    eta: 'Next Stop • Doorstep Fitting (45m)',
  },
  {
    id: 'ATL-ORD-9822',
    orderNumber: 'ATL-ORD-9822',
    trackingBarcode: 'ATL-TRK-9822',
    stopNumber: 2,
    customerName: 'Claire Dupont',
    customerPhone: '+1 (415) 555-0188',
    address: '180 Montgomery St, 15th Fl, San Francisco, CA 94104',
    items: '1x Fluid Black Walnut Catchall Tray',
    notes: 'Reception desk open until 18:00.',
    total: 120.0,
    status: 'out_for_delivery',
    deliveryMode: 'direct',
    eta: 'Stop 2 • ~35 mins',
  },
  {
    id: 'ATL-ORD-9819',
    orderNumber: 'ATL-ORD-9819',
    trackingBarcode: 'ATL-TRK-9819',
    stopNumber: 3,
    customerName: 'Sophia Thorne',
    customerPhone: '+1 (206) 555-0144',
    address: '88 King Street, Seattle, WA 98104',
    items: '1x Tailored Belgian Linen Smock',
    notes: 'Handed directly to recipient.',
    total: 265.0,
    status: 'delivered',
    deliveryMode: 'direct',
    eta: 'Completed',
  },
]

// Interactive Swipe to Deliver Component using Framer Motion
function SwipeToDeliver({ onComplete }: { onComplete: () => void }) {
  const [completed, setCompleted] = useState(false)
  const x = useMotionValue(0)
  const background = useTransform(x, [0, 160], ['#1F1F1F', '#059669'])

  return (
    <div className="relative h-14 bg-[#141414] border-2 border-[#2E2E2E] overflow-hidden select-none">
      <motion.div
        style={{ background }}
        className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-caps text-neutral-300 font-semibold"
      >
        {completed ? (
          <span className="flex items-center gap-2 text-white">
            <Check className="w-4 h-4 text-white" /> Delivered & Synchronized
          </span>
        ) : (
          <span>Swipe to mark Delivered →</span>
        )}
      </motion.div>

      {!completed && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 180 }}
          dragElastic={0.1}
          style={{ x }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 140) {
              setCompleted(true)
              onComplete()
            }
          }}
          className="absolute top-1 left-1 bottom-1 w-12 bg-white text-black flex items-center justify-center font-bold shadow-md cursor-grab active:cursor-grabbing"
        >
          <ChevronRight className="w-5 h-5 text-black" />
        </motion.div>
      )}
    </div>
  )
}

export default function LuxuryAssignedDeliveriesPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<DeliveryTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [courierName, setCourierName] = useState<string>('Courier Officer')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Camera & Barcode Scanner State
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerManualCode, setScannerManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanFeedback, setScanFeedback] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const mapAndSetOrders = useCallback((orders: any[]) => {
    const mapped: DeliveryTask[] = orders.map((o: any, idx: number) => {
      let itemsSummary = 'Curated Atelier Artworks'
      if (o.order_items && o.order_items.length > 0) {
        const itemNames = o.order_items
          .map((item: any) => {
            const title = item.product?.title || 'Atelier Work'
            const count = item.quantity > 1 ? `${item.quantity}x ` : ''
            const size = item.size ? ` (${item.size})` : ''
            return `${count}${title}${size}`
          })
          .join(', ')
        itemsSummary = `${o.order_items.length}x Works [${itemNames}]`
      }

      const recipientName =
        o.user?.name ||
        o.user?.full_name ||
        (o.shipping_address ? o.shipping_address.split(',')[0] : 'Valued Patron')

      const recipientPhone = o.user?.phone || '+1 (415) 555-0192'

      const etaText =
        o.status === 'delivered'
          ? 'Completed'
          : o.delivery_mode === 'try_on'
          ? `Stop ${idx + 1} • Doorstep Fitting (45m)`
          : `Stop ${idx + 1} • Direct Delivery`

      return {
        id: o.id,
        orderNumber: o.order_number || `ATL-ORD-${o.id.slice(0, 4).toUpperCase()}`,
        trackingBarcode: o.tracking_barcode || `ATL-TRK-${o.id.slice(0, 8).toUpperCase()}`,
        stopNumber: idx + 1,
        customerName: recipientName,
        customerPhone: recipientPhone,
        address: o.shipping_address || '742 Evergreen Terrace, San Francisco, CA 94107',
        items: itemsSummary,
        notes: o.delivery_notes || 'Hand directly to patron with white-glove packaging.',
        total: Number(o.total) || 0,
        status: o.status as OrderStatus,
        deliveryMode: (o.delivery_mode as DeliveryMode) || 'direct',
        tryOnStatus: (o.try_on_status as TryOnStatus) || null,
        scheduledSlot:
          o.delivery_mode === 'try_on' ? 'Today • 15:00 – 15:45 (Doorstep Salon)' : undefined,
        eta: etaText,
      }
    })
    setTasks(mapped)
  }, [])

  const fetchDeliveries = useCallback(async () => {
    try {
      const supabase = createBrowserClient()

      // 1. Get current logged-in courier
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .single()

        if (profile?.name) {
          setCourierName(profile.name)
        } else if (user.email) {
          setCourierName(user.email.split('@')[0] || 'Courier')
        }

        // Try to get orders assigned to this courier first
        const { data: assignedData, error: assignedError } = await supabase
          .from('orders')
          .select('*, order_items(*, product:products(*)), user:users!orders_user_id_fkey(*)')
          .eq('delivery_partner_id', user.id)
          .order('created_at', { ascending: false })

        if (!assignedError && assignedData && assignedData.length > 0) {
          mapAndSetOrders(assignedData)
          setLoading(false)
          return
        }
      }

      // Fallback to all orders if none assigned specifically to this courier
      const { data: allOrders, error: allErr } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*)), user:users!orders_user_id_fkey(*)')
        .order('created_at', { ascending: false })

      if (!allErr && allOrders && allOrders.length > 0) {
        mapAndSetOrders(allOrders)
      } else {
        const fallbackAll = await getAllOrders(supabase)
        if (fallbackAll && fallbackAll.length > 0) {
          mapAndSetOrders(fallbackAll)
        } else {
          setTasks(FALLBACK_TASKS)
        }
      }
    } catch (err) {
      console.warn('Error fetching courier deliveries:', err)
      const supabase = createBrowserClient()
      const fallbackAll = await getAllOrders(supabase).catch(() => [])
      if (fallbackAll && fallbackAll.length > 0) {
        mapAndSetOrders(fallbackAll)
      } else {
        setTasks(FALLBACK_TASKS)
      }
    } finally {
      setLoading(false)
    }
  }, [mapAndSetOrders])

  useEffect(() => {
    fetchDeliveries()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('realtime_delivery_manifest')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDeliveries()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDeliveries])

  // Camera Barcode Scanner lifecycle
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const handleBarcodeRecognized = useCallback((code: string) => {
    const cleaned = code.trim().toUpperCase()
    if (!cleaned) return

    setScanFeedback(`Decoded barcode: ${cleaned}`)

    // 1. Check in local tasks list
    const matched = tasks.find(
      (t) =>
        t.trackingBarcode?.toUpperCase() === cleaned ||
        t.orderNumber?.toUpperCase() === cleaned ||
        t.id.toUpperCase() === cleaned ||
        cleaned.includes(t.id.slice(0, 6).toUpperCase())
    )

    stopCamera()
    setScannerOpen(false)

    if (matched) {
      if (matched.deliveryMode === 'try_on') {
        router.push(`/order/${matched.id}/try-on`)
      } else {
        router.push(`/order/${matched.id}/update-status`)
      }
    } else {
      // Navigate to order manifest lookup
      router.push(`/order/${encodeURIComponent(cleaned)}`)
    }
  }, [tasks, router, stopCamera])

  useEffect(() => {
    let animationFrameId: number
    let isCancelled = false

    if (scannerOpen) {
      setCameraError(null)
      setScanFeedback(null)

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          })
          .then((stream) => {
            if (isCancelled) {
              stream.getTracks().forEach((t) => t.stop())
              return
            }
            streamRef.current = stream
            setCameraActive(true)
            if (videoRef.current) {
              videoRef.current.srcObject = stream
              videoRef.current.play().catch(() => {})
            }

            // Real-time Barcode Detector loop if browser supports BarcodeDetector API
            if ('BarcodeDetector' in window) {
              try {
                const detector = new (window as any).BarcodeDetector({
                  formats: ['code_128', 'ean_13', 'qr_code'],
                })

                const scanLoop = async () => {
                  if (videoRef.current && videoRef.current.readyState >= 2) {
                    try {
                      const detected = await detector.detect(videoRef.current)
                      if (detected && detected.length > 0 && detected[0].rawValue) {
                        handleBarcodeRecognized(detected[0].rawValue)
                        return
                      }
                    } catch {
                      // Fallback scan loop
                    }
                  }
                  if (!isCancelled) {
                    animationFrameId = requestAnimationFrame(scanLoop)
                  }
                }
                animationFrameId = requestAnimationFrame(scanLoop)
              } catch (e) {
                console.warn('BarcodeDetector initialization:', e)
              }
            }
          })
          .catch((err) => {
            console.warn('Camera access denied or unavailable:', err)
            setCameraError('Camera access unavailable. Use manual barcode input below.')
            setCameraActive(false)
          })
      } else {
        setCameraError('HTML5 camera interface not supported in this browser. Enter barcode manually.')
      }
    } else {
      stopCamera()
    }

    return () => {
      isCancelled = true
      cancelAnimationFrame(animationFrameId)
      stopCamera()
    }
  }, [scannerOpen, handleBarcodeRecognized, stopCamera])

  const handleMarkDelivered = async (id: string) => {
    try {
      const supabase = createBrowserClient()
      const result = await updateOrderStatus(
        supabase,
        id,
        'delivered',
        'Direct handover confirmed via Courier Mobile Interface.'
      )

      if (result.success) {
        setStatusMessage(`Order ${id.slice(0, 8)} successfully marked as delivered!`)
        setTimeout(() => setStatusMessage(null), 4000)
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: 'delivered', eta: 'Completed Just Now' } : t
        )
      )
    } catch (err) {
      console.warn('Failed to update status in Supabase:', err)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: 'delivered', eta: 'Completed Just Now' } : t
        )
      )
    }
  }

  const activeCount = tasks.filter((t) => t.status !== 'delivered').length
  const completedCount = tasks.filter((t) => t.status === 'delivered').length

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return t.status !== 'delivered'
    if (filter === 'completed') return t.status === 'delivered'
    return true
  })

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Route & Map Timeline Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-baseline flex-wrap gap-2">
          <span className="text-xs font-mono uppercase tracking-caps text-neutral-400">
            Courier Manifest • {courierName}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoading(true)
                fetchDeliveries()
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            {/* Scan Package Action Button */}
            <button
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold uppercase tracking-caps shadow-md active:scale-95 transition-all"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Scan Package</span>
            </button>

            <span className="text-xs font-mono text-emerald-400 font-bold">
              {activeCount} Stops Remaining
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white font-mono">
          Active Shipments
        </h1>

        {statusMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Minimalist Route Map Visualization */}
        <div className="p-4 bg-[#111111] border-2 border-[#222222] space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <Navigation className="w-3.5 h-3.5 text-amber-400" /> Courier GPS Route
            </span>
            <span className="text-neutral-500">Live Elevation 42m</span>
          </div>

          {/* Minimalist route timeline nodes */}
          <div className="relative flex items-center justify-between pt-2 px-2">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#2A2A2A] -translate-y-1/2 z-0" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-4 h-4 bg-emerald-400 rounded-full border-2 border-black" />
              <span className="text-[10px] font-mono text-emerald-400 mt-1">Studio Depot</span>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-4 h-4 bg-amber-400 rounded-full border-2 border-black animate-ping" />
              <div className="w-4 h-4 bg-amber-400 rounded-full border-2 border-black -mt-4" />
              <span className="text-[10px] font-mono text-amber-400 mt-1">Stop 01 (Active)</span>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-3.5 h-3.5 bg-neutral-600 rounded-full border-2 border-black" />
              <span className="text-[10px] font-mono text-neutral-400 mt-1">Next Destination</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#111111] p-1 border border-[#222222]">
        <button
          onClick={() => setFilter('active')}
          className={`py-3 text-xs font-mono uppercase tracking-caps font-bold transition-colors ${
            filter === 'active' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`py-3 text-xs font-mono uppercase tracking-caps font-bold transition-colors ${
            filter === 'completed' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Delivered ({completedCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`py-3 text-xs font-mono uppercase tracking-caps font-bold transition-colors ${
            filter === 'all' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          All ({tasks.length})
        </button>
      </div>

      {/* Delivery Task Cards */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="p-5 bg-[#111111] border-2 border-[#222222] space-y-4 relative"
          >
            {/* Header with Stop & Status Badge */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-white text-black text-xs font-mono font-black">
                  STOP {task.stopNumber}
                </span>
                <span className="text-xs font-mono text-neutral-400">{task.orderNumber}</span>
                {task.trackingBarcode && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900/60 px-1.5 py-0.2">
                    {task.trackingBarcode}
                  </span>
                )}
              </div>

              {task.deliveryMode === 'try_on' ? (
                <span className="px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-700 text-[10px] font-mono font-bold uppercase tracking-caps flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Mode B: 45m Try-On
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-neutral-900 text-neutral-300 border border-neutral-700 text-[10px] font-mono font-bold uppercase tracking-caps">
                  Mode A: Direct
                </span>
              )}
            </div>

            {/* Customer & Destination */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-mono">{task.customerName}</h3>
              <div className="flex items-start gap-1.5 text-xs text-neutral-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{task.address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href={`tel:${task.customerPhone}`} className="hover:underline font-mono">
                  {task.customerPhone}
                </a>
              </div>
            </div>

            {/* Scheduled Fitting Slot or ETA */}
            <div className="p-3 bg-[#181818] border border-[#2A2A2A] text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {task.scheduledSlot || task.eta}
              </span>
              <span className="text-white font-bold">${task.total.toFixed(2)}</span>
            </div>

            {/* Items Summary */}
            <div className="text-xs text-neutral-400 font-mono">
              <span className="text-neutral-500 uppercase block mb-1">Manifest:</span>
              <p className="line-clamp-2">{task.items}</p>
            </div>

            {/* Mode-Specific Actions */}
            {task.status !== 'delivered' ? (
              <div className="space-y-3 pt-2">
                {task.deliveryMode === 'try_on' ? (
                  <div className="space-y-3">
                    <Link
                      href={`/order/${task.id}/try-on`}
                      className="w-full h-14 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-extrabold uppercase tracking-caps flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
                    >
                      <Clock className="w-4 h-4 fill-black" />
                      <span>Enter Try-On Fitting Engine (45m Countdown) →</span>
                    </Link>

                    <Link
                      href={`/order/${task.id}/update-status`}
                      className="block text-center text-xs font-mono uppercase tracking-caps text-neutral-400 hover:text-white py-1"
                    >
                      Manual Status & Proof Editor →
                    </Link>
                  </div>
                ) : (
                  <>
                    <SwipeToDeliver onComplete={() => handleMarkDelivered(task.id)} />

                    <Link
                      href={`/order/${task.id}/update-status`}
                      className="block text-center text-xs font-mono uppercase tracking-caps text-neutral-400 hover:text-white py-2"
                    >
                      Open Full Proof & Notes Editor →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="h-12 bg-[#059669]/20 border border-[#059669]/40 flex items-center justify-center gap-2 text-emerald-300 text-xs font-mono uppercase tracking-caps font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {task.deliveryMode === 'try_on'
                    ? 'Fitting Concluded • Reconciled & Synchronized'
                    : 'Handed Over & Verified'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* HTML5 Camera Barcode Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn font-mono">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-4">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-white text-sm font-bold uppercase tracking-wider">
                  Logistics Barcode Optical Scanner
                </h3>
                <span className="text-[10px] text-neutral-400">
                  Target Code 128 package label or variant SKU
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                stopCamera()
                setScannerOpen(false)
              }}
              className="p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Viewfinder Window */}
          <div className="relative my-4 flex-1 flex flex-col items-center justify-center overflow-hidden bg-black border-2 border-[#2A2A2E]">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Camera className="w-12 h-12 text-neutral-600 animate-pulse" />
                <p className="text-xs text-neutral-400 max-w-xs">
                  {cameraError || 'Initializing optical camera feed...'}
                </p>
              </div>
            )}

            {/* Scanner Reticle & Laser */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-amber-400/80 rounded-sm relative shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                {/* Laser scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-amber-400 animate-pulse shadow-[0_0_10px_#FBBF24] top-1/2 -translate-y-1/2" />
                <span className="absolute -top-6 left-0 text-[10px] text-amber-300 font-bold uppercase tracking-widest">
                  ALIGN BARCODE
                </span>
                <span className="absolute -bottom-6 right-0 text-[9px] text-neutral-400 uppercase">
                  Code 128 / EAN / QR
                </span>
              </div>
            </div>

            {scanFeedback && (
              <div className="absolute bottom-4 left-4 right-4 bg-emerald-950/90 border border-emerald-500 p-2.5 text-center text-xs text-emerald-200">
                {scanFeedback}
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <div className="p-4 bg-[#121216] border border-[#2A2A2E] space-y-3">
            <span className="text-[10px] text-neutral-400 uppercase tracking-caps block font-bold">
              Hardware Scanner / Manual Barcode Entry
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (scannerManualCode.trim()) {
                  handleBarcodeRecognized(scannerManualCode)
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                autoFocus
                value={scannerManualCode}
                onChange={(e) => setScannerManualCode(e.target.value)}
                placeholder="e.g. ATL-TRK-9821, ATL-ORD-9821..."
                className="flex-1 bg-[#0A0A0D] border border-[#2E2E36] px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider"
              >
                Match
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span>Supports bluetooth barcode guns & keyboard emulation</span>
              <button
                type="button"
                onClick={() => handleBarcodeRecognized('ATL-TRK-9821')}
                className="text-amber-400 underline hover:text-amber-300"
              >
                Test with Sample: ATL-TRK-9821
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
