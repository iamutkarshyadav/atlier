'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingDown,
  Layers,
  Copy,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Pencil,
  ImageIcon,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@repo/ui'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

interface PromotionItem {
  id: string
  name: string
  slug: string
  description: string | null
  banner_image_url?: string | null
  promotion_type: 'coupon' | 'automatic_cart' | 'tiered_threshold' | 'buy_x_get_y' | 'shipping_waiver'
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_discount_amount: number | null
  min_order_subtotal: number | null
  usage_limit_total: number | null
  usage_limit_per_customer: number | null
  total_redemptions_count: number
  is_stackable: boolean
  enforce_margin_floor: boolean
  starts_at: string
  ends_at: string | null
  is_active: boolean
  priority: number
  rules?: any[]
  coupons?: any[]
  redemptions?: { count: number }[]
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'coupon' | 'automatic_cart' | 'tiered_threshold' | 'shipping_waiver'>('all')

  // Quick Coupon Modal
  const [selectedPromoForCoupon, setSelectedPromoForCoupon] = useState<PromotionItem | null>(null)
  const [couponDrawerOpen, setCouponDrawerOpen] = useState(false)
  const [couponPrefix, setCouponPrefix] = useState('VIP')
  const [couponCount, setCouponCount] = useState(5)
  const [couponEmail, setCouponEmail] = useState('')
  const [singleCustomCode, setSingleCustomCode] = useState('')
  const [isGeneratingCoupons, setIsGeneratingCoupons] = useState(false)
  const [generatedCouponsList, setGeneratedCouponsList] = useState<any[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const loadPromotions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()
      if (data.promotions) {
        setPromotions(data.promotions)
      }
    } catch (err) {
      console.error('Failed to load promotions', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPromotions()
  }, [])

  const togglePromoStatus = async (promo: PromotionItem) => {
    try {
      const res = await fetch(`/api/admin/promotions/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !promo.is_active }),
      })
      if (res.ok) {
        setPromotions((prev) =>
          prev.map((p) => (p.id === promo.id ? { ...p, is_active: !promo.is_active } : p))
        )
      }
    } catch (err) {
      console.error('Failed to toggle status', err)
    }
  }

  const handleOpenCouponModal = (promo: PromotionItem) => {
    setSelectedPromoForCoupon(promo)
    setGeneratedCouponsList(promo.coupons || [])
    setCouponDrawerOpen(true)
  }

  const handleGenerateCoupons = async (isBulk: boolean) => {
    if (!selectedPromoForCoupon) return
    setIsGeneratingCoupons(true)
    try {
      const payload = isBulk
        ? {
            promotion_id: selectedPromoForCoupon.id,
            prefix: couponPrefix,
            count: Number(couponCount) || 5,
            is_single_use: true,
          }
        : {
            promotion_id: selectedPromoForCoupon.id,
            code: singleCustomCode,
            assigned_customer_email: couponEmail || null,
            is_single_use: false,
          }

      const res = await fetch('/api/admin/promotions/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        const added = data.coupons || (data.coupon ? [data.coupon] : [])
        setGeneratedCouponsList((prev) => [...added, ...prev])
        setSingleCustomCode('')
        setCouponEmail('')
        loadPromotions()
      } else {
        alert(data.error || 'Failed to generate code')
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating coupon')
    } finally {
      setIsGeneratingCoupons(false)
    }
  }

  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.coupons?.some((c) => c.code.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesTab = activeTab === 'all' || p.promotion_type === activeTab

      return matchesSearch && matchesTab
    })
  }, [promotions, searchQuery, activeTab])

  // Metric Computations
  const stats = useMemo(() => {
    const activeCount = promotions.filter((p) => p.is_active).length
    const totalCoupons = promotions.reduce((acc, p) => acc + (p.coupons?.length || 0), 0)
    const totalRedemptions = promotions.reduce((acc, p) => acc + (p.total_redemptions_count || 0), 0)
    const marginProtectedCount = promotions.filter((p) => p.enforce_margin_floor).length

    return {
      activeCount,
      totalCoupons,
      totalRedemptions,
      marginProtectedCount,
    }
  }, [promotions])

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase font-mono">
              Promotions & Pricing Engine
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">
              MARGIN LOCK ACTIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Curate private client privileges, tiered thresholds, margin-protected markdowns, and VIP invitation codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPromotions}
            disabled={isLoading}
            className="font-mono text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link href="/promotions/new">
            <Button size="sm" className="font-mono text-xs bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Privilege Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Active Campaigns</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono">{stats.activeCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Live across Storefront & POS</p>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Invitation Codes</span>
            <Tag className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono">{stats.totalCoupons}</div>
          <p className="text-[11px] text-muted-foreground mt-1">VIP & Concierge codes generated</p>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Total Redemptions</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono">{stats.totalRedemptions}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Applied checkouts</p>
        </div>

        <div className="p-4 rounded-lg border border-border/60 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Margin-Floor Lock</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {stats.marginProtectedCount} / {promotions.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Guarantees selling price &gt;= cost_price</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Privileges' },
            { id: 'coupon', label: 'Invitation Codes' },
            { id: 'automatic_cart', label: 'Automatic Rules' },
            { id: 'tiered_threshold', label: 'Tiered Thresholds' },
            { id: 'shipping_waiver', label: 'Bolt Try-On Waivers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search privileges or codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Campaigns Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-mono text-muted-foreground animate-pulse">
          Loading atelier promotions & pricing rules...
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/80 rounded-lg">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
          <h3 className="text-sm font-semibold font-mono uppercase">No Promotions Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {searchQuery
              ? `No campaigns match your search "${searchQuery}".`
              : 'Create your first luxury promotion or private client privilege.'}
          </p>
          <Link href="/promotions/new">
            <Button size="sm" className="font-mono text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Privilege
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border border-border/60 rounded-lg overflow-hidden bg-card divide-y divide-border/60">
          {filteredPromotions.map((promo) => (
            <div
              key={promo.id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-4 max-w-xl">
                {promo.banner_image_url ? (
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden shrink-0 border border-border/80">
                    <Image
                      src={promo.banner_image_url}
                      alt={promo.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md shrink-0 border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-[9px] font-mono mt-1">No Image</span>
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-sm font-mono tracking-tight">{promo.name}</span>
                    <StatusBadge
                      variant={promo.is_active ? 'active' : 'inactive'}
                      status={promo.is_active ? 'emerald' : 'neutral'}
                    >
                      {promo.is_active ? 'LIVE' : 'PAUSED'}
                    </StatusBadge>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-muted rounded border border-border/60 uppercase">
                    {promo.promotion_type.replace('_', ' ')}
                  </span>
                  {promo.enforce_margin_floor && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Margin Floor
                    </span>
                  )}
                  {promo.is_stackable && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
                      Stackable
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {promo.description || 'Exclusive private client privilege applied at checkout.'}
                </p>

                {/* Terms preview */}
                <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground/90 pt-1 flex-wrap">
                  <span className="text-foreground font-medium">
                    Benefit:{' '}
                    {promo.discount_type === 'percentage'
                      ? `${promo.discount_value}% OFF`
                      : `₹${promo.discount_value.toLocaleString('en-IN')} OFF`}
                    {promo.max_discount_amount && ` (Max ₹${promo.max_discount_amount.toLocaleString('en-IN')})`}
                  </span>

                  {promo.min_order_subtotal && (
                    <span>Min Spend: ₹{promo.min_order_subtotal.toLocaleString('en-IN')}</span>
                  )}

                  <span>Redemptions: {promo.total_redemptions_count}</span>

                  {promo.coupons && promo.coupons.length > 0 && (
                    <span className="text-blue-500 font-medium">
                      Codes: {promo.coupons.length} Active
                    </span>
                  )}
                </div>
              </div>
            </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <Link href={`/promotions/${promo.id}`}>
                  <Button variant="outline" size="sm" className="font-mono text-xs">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Details
                  </Button>
                </Link>

                {promo.promotion_type === 'coupon' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCouponModal(promo)}
                    className="font-mono text-xs"
                  >
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    Manage Codes ({promo.coupons?.length || 0})
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePromoStatus(promo)}
                  className="font-mono text-xs"
                  title={promo.is_active ? 'Pause Campaign' : 'Activate Campaign'}
                >
                  {promo.is_active ? (
                    <span className="text-amber-500 flex items-center gap-1">
                      <ToggleRight className="h-4 w-4" /> Pause
                    </span>
                  ) : (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <ToggleLeft className="h-4 w-4" /> Activate
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Generator Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={couponDrawerOpen}
        onClose={() => setCouponDrawerOpen(false)}
        title={selectedPromoForCoupon?.name || 'Invitation Codes'}
        subtitle="Generate exclusive VIP invitation codes or batch single-use customer invitations."
      >
        <div className="space-y-6">
          {/* Quick Single Custom Code */}
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider">
              Issue Single VIP Custom Code
            </h4>
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Custom Code String
              </label>
              <input
                type="text"
                placeholder="e.g. CURATOR26"
                value={singleCustomCode}
                onChange={(e) => setSingleCustomCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Assigned VIP Email (Optional Private Lock)
              </label>
              <input
                type="email"
                placeholder="patron@domain.com"
                value={couponEmail}
                onChange={(e) => setCouponEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button
              size="sm"
              disabled={!singleCustomCode.trim() || isGeneratingCoupons}
              onClick={() => handleGenerateCoupons(false)}
              className="w-full font-mono text-xs"
            >
              Issue Code
            </Button>
          </div>

          {/* Bulk Generator */}
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider">
              Batch Generate Single-Use VIP Codes
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">Prefix</label>
                <input
                  type="text"
                  value={couponPrefix}
                  onChange={(e) => setCouponPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={couponCount}
                  onChange={(e) => setCouponCount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={isGeneratingCoupons}
              onClick={() => handleGenerateCoupons(true)}
              className="w-full font-mono text-xs"
            >
              Batch Generate Codes
            </Button>
          </div>

          {/* Existing Codes List */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Active Codes ({generatedCouponsList.length})</span>
            </h4>

            {generatedCouponsList.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground">No codes issued yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {generatedCouponsList.map((cp) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between p-2.5 rounded border border-border/60 bg-card text-xs font-mono"
                  >
                    <div>
                      <span className="font-semibold">{cp.code}</span>
                      {cp.assigned_customer_email && (
                        <p className="text-[10px] text-muted-foreground">
                          Reserved: {cp.assigned_customer_email}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Used: {cp.times_used} {cp.max_uses ? `/ ${cp.max_uses}` : ''}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(cp.code)}
                      className="h-7 px-2"
                    >
                      {copiedCode === cp.code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SlideOverDrawer>
    </div>
  )
}
