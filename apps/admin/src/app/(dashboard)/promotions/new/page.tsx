'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Tag,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Zap,
  TrendingDown,
  Layers,
  Percent,
  IndianRupee,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface SimulationResult {
  totalAnalyzed: number
  marginFloorHits: number
  floorHitPercentage: number
  averageMarginBeforePct: number
  averageMarginAfterPct: number
  marginCompressionPct: number
  sampleItems: Array<{
    productId: string
    title: string
    sku: string
    retailPrice: number
    costPrice: number
    proposedDiscount: number
    finalSellingPrice: number
    marginFloorHit: boolean
    marginPctBefore: number
    marginPctAfter: number
  }>
}

export default function NewPromotionPage() {
  const router = useRouter()

  // Form State
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [promotionType, setPromotionType] = useState<
    'coupon' | 'automatic_cart' | 'tiered_threshold' | 'buy_x_get_y' | 'shipping_waiver'
  >('coupon')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(10)
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | ''>('')
  const [minOrderSubtotal, setMinOrderSubtotal] = useState<number | ''>('')
  const [enforceMarginFloor, setEnforceMarginFloor] = useState<boolean>(true)
  const [isStackable, setIsStackable] = useState<boolean>(false)
  const [usageLimitTotal, setUsageLimitTotal] = useState<number | ''>('')
  const [usageLimitPerCustomer, setUsageLimitPerCustomer] = useState<number | ''>(1)
  const [priority, setPriority] = useState<number>(10)
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().slice(0, 16))
  const [endsAt, setEndsAt] = useState<string>('')
  const [initialCouponCode, setInitialCouponCode] = useState<string>('')

  // Targeting Rules State
  const [targetType, setTargetType] = useState<'entire_order' | 'category' | 'collection'>('entire_order')
  const [targetId, setTargetId] = useState<string>('')
  const [categories, setCategories] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)

  useEffect(() => {
    // Load categories and collections for targeting dropdowns
    const fetchMetadata = async () => {
      try {
        const [catRes, colRes] = await Promise.all([
          fetch('/api/admin/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
          fetch('/api/admin/collections').then((r) => r.json()).catch(() => ({ collections: [] })),
        ])
        setCategories(catRes.categories || [])
        setCollections(colRes.collections || [])
      } catch (err) {
        console.error('Failed to load categories/collections', err)
      }
    }
    fetchMetadata()
  }, [])

  // Auto-slug generator
  const handleNameChange = (val: string) => {
    setName(val)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  // Live Margin Simulation Trigger
  const runMarginSimulation = async () => {
    setIsSimulating(true)
    try {
      const res = await fetch('/api/admin/promotions/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_type: discountType,
          discount_value: Number(discountValue) || 0,
          max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          enforce_margin_floor: enforceMarginFloor,
          category_id: targetType === 'category' ? targetId : null,
          min_order_subtotal: minOrderSubtotal ? Number(minOrderSubtotal) : 0,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSimulation(data)
      }
    } catch (err) {
      console.error('Failed simulation', err)
    } finally {
      setIsSimulating(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      runMarginSimulation()
    }, 600)
    return () => clearTimeout(timer)
  }, [discountType, discountValue, maxDiscountAmount, enforceMarginFloor, targetType, targetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError('Please enter a campaign title')
      return
    }
    if (!slug.trim()) {
      setFormError('Please enter a unique URL slug')
      return
    }

    setIsSubmitting(true)

    try {
      const rules = [
        {
          target_type: targetType,
          target_id: targetType === 'entire_order' ? null : targetId || null,
          match_operator: 'include',
        },
      ]

      const coupons = []
      if (promotionType === 'coupon' && initialCouponCode.trim()) {
        coupons.push({
          code: initialCouponCode.trim().toUpperCase(),
          is_single_use: false,
          max_uses: usageLimitTotal ? Number(usageLimitTotal) : null,
          is_active: true,
        })
      }

      const payload = {
        promotion: {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || null,
          promotion_type: promotionType,
          discount_type: discountType,
          discount_value: Number(discountValue) || 0,
          max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          min_order_subtotal: minOrderSubtotal ? Number(minOrderSubtotal) : null,
          usage_limit_total: usageLimitTotal ? Number(usageLimitTotal) : null,
          usage_limit_per_customer: usageLimitPerCustomer ? Number(usageLimitPerCustomer) : null,
          is_stackable: isStackable,
          enforce_margin_floor: enforceMarginFloor,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          is_active: true,
          priority: Number(priority) || 10,
        },
        rules,
        coupons,
      }

      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish campaign')
      }

      router.push('/promotions')
    } catch (err: any) {
      setFormError(err?.message || 'Server error creating promotion')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/promotions">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight uppercase">
              Curate Private Client Privilege
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Architect discounts, coupon codes, luxury tier unlocks, and margin-floor guards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/promotions">
            <Button variant="outline" size="sm" className="font-mono text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="font-mono text-xs bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Privilege'
            )}
          </Button>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Grid: Form Left, Simulator Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 cols */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Step 1: Privilege Identity */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                1. Campaign Identity & Scope
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Autumn Gala Inaugural Privilege"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    placeholder="autumn-gala-privilege"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Privilege Type
                  </label>
                  <select
                    value={promotionType}
                    onChange={(e) => setPromotionType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="coupon">Private Invitation Code (Coupon)</option>
                    <option value="automatic_cart">Automatic Cart Privilege</option>
                    <option value="tiered_threshold">Tiered Order Threshold (Luxury Bar)</option>
                    <option value="shipping_waiver">Complimentary Bolt Try-On / Shipping</option>
                    <option value="buy_x_get_y">Buy X Get Y (BXGY)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Description / Concierge Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Private client invitation: 15% privilege across Autumn Capsule garments."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Discount Mechanism */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                2. Discount Mechanism & Financials
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Calculation Method
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-1.5 text-xs font-mono uppercase rounded border transition-colors ${
                      discountType === 'percentage'
                        ? 'bg-foreground text-background font-semibold border-foreground'
                        : 'border-border/60 text-muted-foreground'
                    }`}
                  >
                    % Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed_amount')}
                    className={`flex-1 py-1.5 text-xs font-mono uppercase rounded border transition-colors ${
                      discountType === 'fixed_amount'
                        ? 'bg-foreground text-background font-semibold border-foreground'
                        : 'border-border/60 text-muted-foreground'
                    }`}
                  >
                    ₹ Fixed Amount
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Privilege Value ({discountType === 'percentage' ? '%' : '₹'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={discountType === 'percentage' ? 100 : 500000}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Max Cap Limit (₹ Ceiling)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000 (Optional)"
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Limits maximum total rupees waived per checkout.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Min Cart Subtotal (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000 (Optional)"
                  value={minOrderSubtotal}
                  onChange={(e) => setMinOrderSubtotal(e.target.value ? Number(e.target.value) : '')}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Minimum spend needed to activate privilege.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Targeting Scope */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                3. Catalog Targeting Scope
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Target Scope
                </label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value as any)
                    setTargetId('')
                  }}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="entire_order">Entire Order (All Garments)</option>
                  <option value="category">Specific Category</option>
                  <option value="collection">Specific Collection / Occasion</option>
                </select>
              </div>

              {targetType === 'category' && (
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Select Category
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'collection' && (
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Select Collection
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Collection --</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Margin-Floor Guardrails & Limits */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                4. Margin-Floor Guardrails & Limits
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded border border-emerald-500/30 bg-emerald-500/5">
                <div>
                  <div className="text-xs font-mono font-semibold text-emerald-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Enforce Margin-Floor Lock
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Stops any discount from dropping a garment&apos;s selling price below its raw manufacturing cost_price.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enforceMarginFloor}
                  onChange={(e) => setEnforceMarginFloor(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded border border-border/60 bg-muted/20">
                <div>
                  <div className="text-xs font-mono font-semibold">Allow Rule Stacking</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Permits combination with other automatic markdowns or shipping fee waivers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isStackable}
                  onChange={(e) => setIsStackable(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Total Quota
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={usageLimitTotal}
                    onChange={(e) => setUsageLimitTotal(e.target.value ? Number(e.target.value) : '')}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Per-Client Limit
                  </label>
                  <input
                    type="number"
                    placeholder="1"
                    value={usageLimitPerCustomer}
                    onChange={(e) =>
                      setUsageLimitPerCustomer(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Priority Rank
                  </label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Schedule & Initial Coupon */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                5. Schedule & Invitation Code
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Activation Window Start *
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Window End (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {promotionType === 'coupon' && (
              <div className="pt-2">
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Initial VIP Invitation Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIPEXCLUSIVE2026"
                  value={initialCouponCode}
                  onChange={(e) => setInitialCouponCode(e.target.value.toUpperCase())}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  You can issue additional single-use or batch codes after creating the campaign.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Right Side: Live Margin Impact Simulator (5 cols sticky) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="p-5 rounded-lg border border-border/80 bg-card/95 backdrop-blur shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  Live Margin Impact Simulator
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={runMarginSimulation}
                disabled={isSimulating}
                className="h-7 px-2 font-mono text-[10px]"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isSimulating ? 'animate-spin' : ''}`} />
                Simulate
              </Button>
            </div>

            {isSimulating && !simulation ? (
              <div className="p-8 text-center text-xs font-mono text-muted-foreground animate-pulse">
                Evaluating catalog margin headroom against cost_price...
              </div>
            ) : simulation ? (
              <div className="space-y-4">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-border/60 bg-muted/20">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      Margin Floor Hits
                    </span>
                    <div className="text-lg font-bold font-mono text-emerald-500">
                      {simulation.marginFloorHits} / {simulation.totalAnalyzed}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {simulation.floorHitPercentage}% clamped at cost
                    </span>
                  </div>

                  <div className="p-3 rounded border border-border/60 bg-muted/20">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      Margin Compression
                    </span>
                    <div className="text-lg font-bold font-mono">
                      {simulation.averageMarginBeforePct}% → {simulation.averageMarginAfterPct}%
                    </div>
                    <span className="text-[10px] font-mono text-amber-500">
                      -{simulation.marginCompressionPct}% net shift
                    </span>
                  </div>
                </div>

                {/* Margin Alert Notice */}
                {simulation.marginFloorHits > 0 ? (
                  <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-mono flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Margin Floor Protection Active</p>
                      <p className="text-[11px] text-emerald-500/90 mt-0.5">
                        {simulation.marginFloorHits} garments would have sold at a loss, but their discount is
                        automatically clamped so final retail price never drops below raw cost_price.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded border border-border/60 bg-muted/20 text-xs font-mono text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>All analyzed catalog pieces maintain healthy positive margins.</span>
                  </div>
                )}

                {/* Sample Products Table */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    Catalog Sample Preview ({simulation.sampleItems.length})
                  </span>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {simulation.sampleItems.map((it) => (
                      <div
                        key={it.productId}
                        className="p-2.5 rounded border border-border/60 bg-background text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate max-w-[180px]">{it.title}</span>
                          {it.marginFloorHit ? (
                            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-semibold">
                              FLOOR LOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              {it.marginPctAfter}% margin
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>MRP: ₹{it.retailPrice.toLocaleString('en-IN')}</span>
                          <span>Cost: ₹{it.costPrice.toLocaleString('en-IN')}</span>
                          <span className="text-foreground font-semibold">
                            Final: ₹{it.finalSellingPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
