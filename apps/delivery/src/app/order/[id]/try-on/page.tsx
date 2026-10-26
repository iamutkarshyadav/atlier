'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { ActiveTryOnEngine, type TryOnOrderData } from '../../../../components/ActiveTryOnEngine'
import { createBrowserClient } from '@repo/supabase/browser'

interface PageProps {
  params: { id: string }
}

const FALLBACK_ORDER: TryOnOrderData = {
  id: 'ATL-ORD-9821',
  customerName: 'Eleanor Vance',
  customerPhone: '+1 (415) 555-0192',
  address: '742 Evergreen Terrace, Studio 4B, San Francisco, CA 94107',
  scheduledSlot: 'Today • 15:00 – 15:45 (Doorstep Salon Fitting Window)',
  notes: 'Please ring private bell 4B or coordinate with private courtyard concierge.',
  items: [
    {
      id: 'item_1',
      title: 'Architectural Selvedge Linen Smock',
      category: 'Wearable Art',
      edition: 'Edition 05 of 15',
      size: 'Taille 02 (FR 40–42)',
      price: 240.0,
      image: '/images/prod3-front.jpg',
      isKept: true,
    },
    {
      id: 'item_2',
      title: 'Sculptural Sandstone Vessel',
      category: 'Ceramics',
      edition: 'Edition 01 of 12',
      price: 185.0,
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      isKept: false,
      rejectionReason: 'Scale mismatch with private salon pedestal',
    },
    {
      id: 'item_3',
      title: 'Carved Alabaster Pendant Cylinder',
      category: 'Lighting',
      edition: 'Edition 02 of 06',
      price: 420.0,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
      isKept: true,
    },
  ],
}

export default function TryOnOrderPage({ params }: PageProps) {
  const orderId = params.id
  const [orderData, setOrderData] = useState<TryOnOrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSupabaseOrder() {
      try {
        const supabase = createBrowserClient()

        // Check if params.id matches UUID or order_number
        let query = supabase
          .from('orders')
          .select('*, order_items(*, product:products(*)), user:users!orders_user_id_fkey(*)')

        // If it looks like a standard UUID
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
        ) {
          query = query.eq('id', orderId)
        } else {
          // Otherwise search by order_number, tracking_barcode, or id
          query = query.or(`order_number.eq.${orderId},tracking_barcode.eq.${orderId},id.eq.${orderId}`)
        }

        const { data: order, error } = await query.maybeSingle()

        if (order) {
          let mappedItems = []

          if ((order as any).order_items && (order as any).order_items.length > 0) {
            mappedItems = (order as any).order_items.map((it: any, idx: number) => {
              const product = it.product || {}
              return {
                id: it.id,
                title: product.title || `Atelier Curated Work № 0${idx + 1}`,
                category: product.category || 'Wearable Art',
                edition: product.edition || 'Numbered Edition',
                size: it.size || undefined,
                price: Number(it.unit_price) || Number(product.price) || 200,
                image: product.image_url || '/images/prod3-front.jpg',
                isKept: it.is_kept !== null ? it.is_kept : true,
                rejectionReason: it.rejection_reason || undefined,
              }
            })
          } else {
            // Default item if no order_items were returned
            mappedItems = FALLBACK_ORDER.items
          }

          const recipientName =
            (order as any).user?.name ||
            (order as any).user?.full_name ||
            ((order as any).shipping_address ? (order as any).shipping_address.split(',')[0] : 'Valued Patron')

          const recipientPhone = (order as any).user?.phone || '+1 (415) 555-0192'

          setOrderData({
            id: order.id,
            customerName: recipientName,
            customerPhone: recipientPhone,
            address: order.shipping_address || FALLBACK_ORDER.address,
            scheduledSlot: 'Today • 15:00 – 15:45 (Doorstep Salon Fitting Window)',
            notes: order.delivery_notes || FALLBACK_ORDER.notes,
            items: mappedItems,
          })
        } else {
          // Fallback with custom order id
          setOrderData({
            ...FALLBACK_ORDER,
            id: orderId || FALLBACK_ORDER.id,
          })
        }
      } catch (err) {
        console.warn('Error loading order for try-on fitting:', err)
        setOrderData({
          ...FALLBACK_ORDER,
          id: orderId || FALLBACK_ORDER.id,
        })
      } finally {
        setLoading(false)
      }
    }

    loadSupabaseOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-xs font-mono uppercase tracking-caps text-neutral-400">
          Initializing OLED Fitting Terminal & Synchronizing Order...
        </p>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold uppercase text-white">Order Not Found</h2>
        <p className="text-xs font-mono text-neutral-400">
          The requested shipment record could not be loaded from Supabase.
        </p>
        <Link
          href="/assigned-deliveries"
          className="inline-flex items-center gap-2 text-xs font-mono text-white bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Manifest
        </Link>
      </div>
    )
  }

  return <ActiveTryOnEngine orderData={orderData} />
}
