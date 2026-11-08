'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Store,
  Warehouse,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getAllOrders,
  getAllProductsAdmin,
  type Order,
  type Product,
} from '@repo/supabase/utils'
import { useLocation } from '@/context/LocationContext'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function DashboardOverviewPage() {
  const { activeLocationCode } = useLocation()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [allOrders, allProds] = await Promise.all([
        getAllOrders(supabase),
        getAllProductsAdmin(supabase),
      ])
      setOrders(allOrders)
      setProducts(allProds)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Derived metrics
  const grossRevenue = orders.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0)
  const openOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'out_for_delivery'
  ).length
  const lowStockItems = products.filter((p) => p.stock <= 5)

  return (
    <div className="space-y-4 font-mono">
      {/* Top Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-chrome-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span>Omnichannel Operations Control</span>
            <span className="text-2xs font-normal text-zinc-500 bg-chrome-900 px-1.5 py-0.5 border border-chrome-800">
              {activeLocationCode}
            </span>
          </h1>
          <p className="text-2xs text-zinc-400">
            Realtime supply chain, inventory levels, online dispatch, and boutique POS stream
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="h-7 px-2.5 text-2xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Link href="/pos">
            <Button
              variant="terminal"
              size="sm"
              className="h-7 px-2.5 text-2xs bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/40 flex items-center gap-1.5"
            >
              <Store className="w-3 h-3" /> POS Terminal
            </Button>
          </Link>
          <Link href="/locations">
            <Button
              variant="terminal"
              size="sm"
              className="h-7 px-2.5 text-2xs bg-chrome-900 text-zinc-300 border border-chrome-800 hover:bg-chrome-850 flex items-center gap-1.5"
            >
              <Warehouse className="w-3 h-3" /> Shelf WMS
            </Button>
          </Link>
        </div>
      </div>

      {/* Dense 44px Horizontal Operational Metric Ribbon */}
      <div className="h-11 bg-chrome-900 border border-chrome-800 grid grid-cols-2 lg:grid-cols-4 divide-x divide-chrome-800 items-center px-1">
        {/* Metric 1: Realized Revenue */}
        <div className="px-3 flex items-center justify-between">
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold">
            Realized Gross
          </span>
          <span className="text-sm font-semibold text-zinc-100 tabular-nums">
            ${grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Metric 2: Open In-Flight Orders */}
        <div className="px-3 flex items-center justify-between">
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold">
            In-Flight Orders
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-amber-400 tabular-nums">
              {openOrdersCount}
            </span>
            <span className="text-3xs text-zinc-500">/ {orders.length} total</span>
          </div>
        </div>

        {/* Metric 3: Low-Stock Alerts */}
        <div className="px-3 flex items-center justify-between">
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold">
            Low Stock SKUs
          </span>
          <span className={`text-sm font-semibold tabular-nums ${lowStockItems.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {lowStockItems.length}
          </span>
        </div>

        {/* Metric 4: Active Locations & Nodes */}
        <div className="px-3 flex items-center justify-between">
          <span className="text-3xs uppercase tracking-wider text-zinc-500 font-semibold">
            Operational Nodes
          </span>
          <span className="text-sm font-semibold text-cyan-400 tabular-nums">
            3 Active
          </span>
        </div>
      </div>

      {/* Split View: Live Omnichannel Orders (60%) & Low-Stock Alerts (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Omnichannel Orders */}
        <div className="lg:col-span-7 bg-chrome-900 border border-chrome-800 flex flex-col">
          <div className="h-9 px-3 border-b border-chrome-800 flex items-center justify-between bg-chrome-950">
            <span className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
              Live Omnichannel Orders
            </span>
            <Link
              href="/orders"
              className="text-2xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              All Orders <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-chrome-800 flex-1 overflow-y-auto max-h-[460px]">
            {orders.slice(0, 8).map((ord) => {
              const isPOS = ord.order_number?.startsWith('POS-')
              return (
                <div
                  key={ord.id}
                  className="px-3 py-2 flex items-center justify-between hover:bg-chrome-850 transition-colors text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-100 tabular-nums">
                        {ord.order_number || `ORD-${ord.id.slice(0, 8).toUpperCase()}`}
                      </span>
                      <span className="text-3xs font-mono uppercase bg-chrome-800 text-zinc-300 px-1 py-0.2 border border-chrome-750">
                        {isPOS ? 'POS Boutique' : 'Online Store'}
                      </span>
                      <StatusBadge variant={ord.status} dot />
                    </div>
                    <p className="text-2xs text-zinc-500 truncate max-w-sm">
                      {ord.shipping_address || 'Walk-in Boutique Client'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-zinc-100 tabular-nums">
                      ${Number(ord.total).toFixed(2)}
                    </p>
                    <p className="text-3xs text-zinc-500 tabular-nums">
                      {ord.created_at ? new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </p>
                  </div>
                </div>
              )
            })}

            {orders.length === 0 && !isLoading && (
              <div className="p-8 text-center text-xs text-zinc-500">
                No active orders recorded. Checkouts from POS or Storefront will populate here.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Low Stock Shelf Alerts */}
        <div className="lg:col-span-5 bg-chrome-900 border border-chrome-800 flex flex-col">
          <div className="h-9 px-3 border-b border-chrome-800 flex items-center justify-between bg-chrome-950">
            <span className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Low Stock & Replenishment Alerts
            </span>
            <Link
              href="/inventory"
              className="text-2xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              Inventory Matrix <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-chrome-800 flex-1 overflow-y-auto max-h-[460px]">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((prod) => (
                <div
                  key={prod.id}
                  className="px-3 py-2 flex items-center justify-between hover:bg-chrome-850 transition-colors text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200 truncate max-w-[180px]">
                        {prod.title}
                      </span>
                      <span className="text-3xs text-zinc-500 uppercase">{prod.category || 'Garment'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-zinc-500">
                      <span>Primary Bin:</span>
                      <span className="text-zinc-300 font-semibold">BLK-A-01-A1</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block px-1.5 py-0.5 text-2xs font-semibold tabular-nums bg-rose-950/40 text-rose-400 border border-rose-800/60">
                      {prod.stock} units remaining
                    </span>
                    <Link
                      href={`/inventory/transfers?product=${prod.id}`}
                      className="block text-3xs text-zinc-400 hover:text-emerald-400 underline"
                    >
                      Initiate Transfer
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500">
                All shelf inventories exceed safety reorder thresholds.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
