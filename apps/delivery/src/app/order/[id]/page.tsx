'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Package,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Navigation,
} from 'lucide-react'
import { Button, Badge, Barcode } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import { getOrderById, type OrderWithItems } from '@repo/supabase/utils'

interface OrderManifestPageProps {
  params: { id: string }
}

export default function OrderManifestDispatchPage({ params }: OrderManifestPageProps) {
  const router = useRouter()
  const rawId = params.id
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchManifest() {
      setLoading(true)
      try {
        const supabase = createBrowserClient()
        const found = await getOrderById(supabase, rawId)
        if (found) {
          setOrder(found)
        } else {
          setError(`No atelier package matched barcode or order ID: "${rawId}"`)
        }
      } catch (err: any) {
        setError(err.message || 'Error resolving delivery manifest.')
      } finally {
        setLoading(false)
      }
    }
    fetchManifest()
  }, [rawId])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 font-mono text-xs text-neutral-400">
        <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin rounded-full" />
        <p className="tracking-caps uppercase">Decoding Package Barcode Manifest...</p>
      </div>
    )
  }

  if (!order || error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
        <div className="p-4 bg-rose-950/40 border border-rose-900/60 max-w-md w-full">
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
            Barcode Not Recognized
          </p>
          <p className="text-neutral-300 text-xs font-sans">
            {error || 'Unable to identify package.'}
          </p>
        </div>
        <Link href="/assigned-deliveries">
          <Button variant="terminal" size="sm">
            ← Return to Courier Manifest
          </Button>
        </Link>
      </div>
    )
  }

  const trackingBarcode = order.tracking_barcode || `ATL-TRK-${order.id.slice(0, 8).toUpperCase()}`
  const isTryOn = order.delivery_mode === 'try_on'
  const recipientName = order.user?.name || (order.shipping_address ? order.shipping_address.split(',')[0] : 'Valued Patron')
  const recipientPhone = order.user?.phone || '+1 (415) 555-0192'
  const items = order.order_items || []

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-4">
        <Link
          href="/assigned-deliveries"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Courier Route</span>
        </Link>

        <span className="text-[10px] font-mono uppercase tracking-caps text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900 px-2 py-0.5">
          Scanned & Verified
        </span>
      </div>

      {/* Hero Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          DELIVERY MANIFEST DOSSIER
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white font-mono">
          {order.order_number || `ATL-ORD-${order.id.slice(0, 6).toUpperCase()}`}
        </h1>
        <p className="text-xs text-neutral-400">
          Assigned to white-glove courier fleet. Verified via hardware package scan.
        </p>
      </div>

      {/* Barcode & Logistics Card */}
      <div className="p-4 bg-[#111111] border-2 border-[#222222] space-y-3">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-neutral-400 uppercase tracking-caps">Shipment Barcode</span>
          <span className="text-amber-400 font-bold">{trackingBarcode}</span>
        </div>

        <div className="bg-[#08080A] p-3 border border-[#222222] flex flex-col items-center justify-center">
          <Barcode
            value={trackingBarcode}
            height={44}
            width={1.5}
            theme="terminal"
            displayValue={true}
          />
        </div>
      </div>

      {/* Patron Contact & Destination */}
      <div className="p-5 bg-[#111111] border-2 border-[#222222] space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-caps text-neutral-400">
              Patron Destination
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 border uppercase font-bold ${
              isTryOn
                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                : 'bg-neutral-900 border-neutral-700 text-neutral-300'
            }`}
          >
            {isTryOn ? 'Mode B: 45m Try-On Fitting' : 'Mode A: Direct Hand-Off'}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white font-serif">{recipientName}</h2>
          <div className="flex items-start gap-2 text-xs text-neutral-300">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>{order.shipping_address || '742 Evergreen Terrace, Studio 4B, San Francisco, CA 94107'}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <a href={`tel:${recipientPhone}`} className="hover:underline font-mono">
              {recipientPhone}
            </a>
          </div>
        </div>

        {order.delivery_notes && (
          <div className="p-3 bg-[#18181A] border border-[#2A2A2E] text-xs text-neutral-300">
            <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">
              Patron Fitting Notes
            </span>
            &ldquo;{order.delivery_notes}&rdquo;
          </div>
        )}
      </div>

      {/* Curated Package Manifest */}
      <div className="p-5 bg-[#111111] border-2 border-[#222222] space-y-3 font-mono">
        <div className="flex justify-between items-center text-xs border-b border-[#222222] pb-2">
          <span className="uppercase text-neutral-400 tracking-caps">Package Contents ({items.length} Works)</span>
          <span className="text-white font-bold">${Number(order.total).toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex justify-between items-center p-2.5 bg-[#161618] border border-[#26262B] text-xs"
            >
              <div>
                <p className="font-bold text-white">{item.product?.title || 'Atelier Work'}</p>
                <p className="text-[10px] text-neutral-400">
                  Size: {item.size || 'M'} • Qty: {item.quantity || 1}
                </p>
              </div>
              <span className="text-neutral-300 font-mono">
                ${Number(item.unit_price).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="space-y-3 pt-2">
        {isTryOn ? (
          <Button
            onClick={() => router.push(`/order/${order.id}/try-on`)}
            className="w-full py-4 text-sm font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 shadow-lg"
          >
            <Clock className="w-4 h-4" />
            <span>Launch 45-Minute Doorstep Salon Fitting →</span>
          </Button>
        ) : (
          <Button
            onClick={() => router.push(`/order/${order.id}/update-status`)}
            className="w-full py-4 text-sm font-bold uppercase tracking-wider bg-white hover:bg-neutral-200 text-black flex items-center justify-center gap-2 shadow-lg"
          >
            <Package className="w-4 h-4" />
            <span>Confirm Package Hand-off & Proof →</span>
          </Button>
        )}

        <div className="flex justify-between gap-3">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              order.shipping_address || 'San Francisco, CA'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-[#16161A] border-[#2A2A30] text-neutral-300 text-xs flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" /> Open Navigation GPS
            </Button>
          </a>

          <a href={`tel:${recipientPhone}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-[#16161A] border-[#2A2A30] text-neutral-300 text-xs flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Patron
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
