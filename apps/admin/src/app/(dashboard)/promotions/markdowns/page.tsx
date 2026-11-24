'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingDown,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  AlertCircle,
  Tag,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

interface PriceScheduleItem {
  id: string
  product_id: string
  variant_id: string | null
  scheduled_price: number
  original_price: number
  starts_at: string
  ends_at: string | null
  reason: string | null
  campaign_name?: string | null
  is_active: boolean
  product?: {
    id: string
    title: string
    price: number
    cost_price: number | null
  }
  variant?: {
    id: string
    sku: string
    size: string
  }
}

export default function MarkdownsPage() {
  const [schedules, setSchedules] = useState<PriceScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Creation State
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [promotionalPrice, setPromotionalPrice] = useState<number | ''>('')
  const [campaignName, setCampaignName] = useState('')
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16))
  const [endsAt, setEndsAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadSchedules = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/promotions/markdowns')
      const data = await res.json()
      if (data.schedules) {
        setSchedules(data.schedules)
      }
    } catch (err) {
      console.error('Failed to load markdowns', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
    // Load products list for dropdown
    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .catch(() => ({}))
    fetch('/api/inventory?limit=100')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
  }, [])

  const handleCreateMarkdown = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || !promotionalPrice) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/promotions/markdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          promotional_price: Number(promotionalPrice),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          campaign_name: campaignName.trim() || 'Scheduled Markdown',
          is_active: true,
        }),
      })

      if (res.ok) {
        setModalOpen(false)
        setSelectedProductId('')
        setPromotionalPrice('')
        setCampaignName('')
        loadSchedules()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create markdown')
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating markdown')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = schedules.filter((s) => {
    const title = s.product?.title || ''
    const campaign = s.campaign_name || s.reason || ''
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase font-mono">
              Scheduled Markdowns
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded">
              AUTO-REVERT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Program temporary promotional prices and seasonal flash drops with automated time windows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedules}
            disabled={isLoading}
            className="font-mono text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="font-mono text-xs bg-primary text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Schedule Markdown
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search garment or markdown event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Schedules List */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-mono text-muted-foreground animate-pulse">
          Loading price markdown schedules...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/80 rounded-lg">
          <TrendingDown className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
          <h3 className="text-sm font-semibold font-mono uppercase">No Markdowns Scheduled</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Schedule temporary price drops with automatic calendar reversion.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)} className="font-mono text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Schedule Markdown
          </Button>
        </div>
      ) : (
        <div className="border border-border/60 rounded-lg overflow-hidden bg-card divide-y divide-border/60">
          {filtered.map((item) => {
            const now = new Date()
            const start = new Date(item.starts_at)
            const end = item.ends_at ? new Date(item.ends_at) : null
            const isLive = item.is_active && start <= now && (!end || end >= now)
            const isUpcoming = item.is_active && start > now

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm font-mono">
                      {item.product?.title || 'Garment'}
                    </span>
                    <StatusBadge
                      status={isLive ? 'emerald' : isUpcoming ? 'amber' : 'neutral'}
                    >
                      {isLive ? 'LIVE ON STOREFRONT' : isUpcoming ? 'SCHEDULED' : 'ENDED'}
                    </StatusBadge>
                    {item.campaign_name && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-muted rounded border border-border/60 uppercase">
                        {item.campaign_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                    <span>
                      Standard MRP:{' '}
                      <span className="line-through">
                        ₹{(item.product?.price || 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="text-emerald-500 font-semibold">
                      Promotional Price: ₹{(item.scheduled_price ?? 0).toLocaleString('en-IN')}
                    </span>
                    {item.product?.cost_price && (
                      <span className="text-muted-foreground/70">
                        Cost Floor: ₹{item.product.cost_price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/80 pt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Starts: {new Date(item.starts_at).toLocaleString('en-IN')}</span>
                    {item.ends_at && (
                      <span>• Ends: {new Date(item.ends_at).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Markdown Modal */}
      <SlideOverDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Temporary Markdown"
        subtitle="Set a promotional price that automatically activates and reverts on your schedule."
      >
        <form onSubmit={handleCreateMarkdown} className="space-y-4">
          <div>
            <label className="text-[11px] font-mono text-muted-foreground uppercase">
              Campaign / Event Title
            </label>
            <input
              type="text"
              placeholder="e.g. Weekend Flash Soirée"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-muted-foreground uppercase">
              Select Garment *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">-- Choose Garment from Catalog --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (MRP: ₹{p.price?.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-muted-foreground uppercase">
              Promotional Selling Price (₹) *
            </label>
            <input
              type="number"
              placeholder="e.g. 19999"
              value={promotionalPrice}
              onChange={(e) => setPromotionalPrice(e.target.value ? Number(e.target.value) : '')}
              className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                End Time (Auto-Revert)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !selectedProductId || !promotionalPrice}
            className="w-full font-mono text-xs bg-primary text-primary-foreground mt-4"
          >
            {isSubmitting ? 'Scheduling...' : 'Confirm & Schedule Markdown'}
          </Button>
        </form>
      </SlideOverDrawer>
    </div>
  )
}
