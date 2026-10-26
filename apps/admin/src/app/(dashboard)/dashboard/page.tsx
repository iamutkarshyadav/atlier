'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  Boxes,
  ShoppingBag,
  ShieldAlert,
  RefreshCw,
  FolderTree,
} from 'lucide-react'
import { Badge, Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getAllOrders,
  getAllProductsAdmin,
  getDeliveryCouriers,
  type Order,
  type Product,
} from '@repo/supabase/utils'

export default function LuxuryDashboardOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [courierCount, setCourierCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const [allOrders, allProds, couriers] = await Promise.all([
        getAllOrders(supabase),
        getAllProductsAdmin(supabase),
        getDeliveryCouriers(supabase),
      ])
      setOrders(allOrders)
      setProducts(allProds)
      setCourierCount(couriers.length)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Aggregate Metrics
  const grossRevenue = orders.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0)
  const inFlightCount = orders.filter((o) => o.status === 'processing' || o.status === 'out_for_delivery').length
  const lowStockProds = products.filter((p) => p.stock <= 5)

  return (
    <div className="space-y-10 font-mono">
      {/* Terminal Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#23232A] pb-6">
        <div>
          <span className="text-[10px] tracking-caps uppercase text-neutral-500 block">
            Executive Ledger & Sovereign Control
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-white mt-1">
            Studio Performance
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Button
            variant="terminal"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Link href="/categories">
            <Button variant="terminal" size="sm" className="bg-[#18181C] text-white flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-amber-400" /> Categories
            </Button>
          </Link>
          <Link href="/inventory">
            <Button variant="terminal" size="sm" className="bg-[#18181C] text-white">
              Archive Catalog
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="terminal" size="sm" className="bg-[#18181C] text-white">
              Active Manifest
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Terminal Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-[#121215] border border-[#23232A] space-y-3">
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span className="uppercase tracking-caps">Gross Realized</span>
            <Activity className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-3xl font-light text-white tracking-tight">
            ${grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Live from Supabase orders
          </div>
        </div>

        <div className="p-6 bg-[#121215] border border-[#23232A] space-y-3">
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span className="uppercase tracking-caps">Commissions In Flight</span>
            <ShoppingBag className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-3xl font-light text-white tracking-tight">
            {inFlightCount}
          </div>
          <div className="text-[11px] text-neutral-400">
            {orders.length} total lifetime orders
          </div>
        </div>

        <div className="p-6 bg-[#121215] border border-[#23232A] space-y-3">
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span className="uppercase tracking-caps">Dedicated Couriers</span>
            <Boxes className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-3xl font-light text-white tracking-tight">
            0{courierCount}
          </div>
          <div className="text-[11px] text-amber-400/90">
            Assigned logistics fleet
          </div>
        </div>

        <div className="p-6 bg-[#121215] border border-[#23232A] space-y-3">
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span className="uppercase tracking-caps">Scarcity Alert</span>
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-3xl font-light text-amber-300 tracking-tight">
            {lowStockProds.length < 10 ? `0${lowStockProds.length}` : lowStockProds.length}
          </div>
          <div className="text-[11px] text-amber-400/80 truncate">
            {lowStockProds[0] ? `${lowStockProds[0].title} (${lowStockProds[0].stock} units)` : 'Stock healthy'}
          </div>
        </div>
      </div>

      {/* Main Terminal Grid: Recent Studio Transactions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-[#23232A] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-mono tracking-caps text-neutral-400">
              Live Order Stream (Supabase PostgreSQL)
            </span>
          </div>
          <Link
            href="/orders"
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            All Manifests <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="border border-[#23232A] bg-[#121215] divide-y divide-[#1D1D23] font-mono text-xs">
          {orders.slice(0, 5).map((ord) => (
            <div
              key={ord.id}
              className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[#18181C] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    {ord.order_number || `ATL-${ord.id.slice(0, 6).toUpperCase()}`}
                  </span>
                  <Badge variant={ord.status === 'delivered' ? 'success' : ord.status === 'out_for_delivery' ? 'warning' : 'secondary'}>
                    {ord.status}
                  </Badge>
                  <span className="text-[10px] text-neutral-500">
                    {ord.delivery_mode === 'try_on' ? 'Mode B: 45m Try-On' : 'Mode A: Direct'}
                  </span>
                </div>
                <p className="text-neutral-400 font-sans text-xs truncate max-w-md">
                  {ord.shipping_address || 'Studio Address'}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-medium text-white">${Number(ord.total).toFixed(2)} USD</p>
                <p className="text-[11px] text-neutral-500 font-sans">
                  {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Active'}
                </p>
              </div>
            </div>
          ))}

          {orders.length === 0 && !isLoading && (
            <div className="p-12 text-center text-xs text-neutral-500">
              No orders placed yet. Orders created via Storefront will stream into this terminal.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
