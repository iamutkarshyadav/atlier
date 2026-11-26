'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  UploadCloud,
  ImageIcon,
  X,
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
  const [tier, setTier] = useState<1 | 2 | 3>(2)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'free_shipping'>('percentage')
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
  const [isPublicCoupon, setIsPublicCoupon] = useState<boolean>(false)

  // 1-Click Storefront Nudge State
  const [promoteViaNudge, setPromoteViaNudge] = useState<boolean>(false)
  const [nudgeSurfaceTier, setNudgeSurfaceTier] = useState<'bottom_sheet' | 'top_bar' | 'floating_pill'>('bottom_sheet')

  // Banner Image State
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')
  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false)
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null)

  // Boolean Rule Groups State
  interface CustomRule {
    id: string
    match_operator: 'include' | 'exclude'
    rule_target_type: 'entire_order' | 'category' | 'subcategory' | 'collection' | 'try_on_eligible' | 'specific_sku'
    target_values: string[]
  }

  const [rulesList, setRulesList] = useState<CustomRule[]>([
    { id: 'rule_1', match_operator: 'include', rule_target_type: 'entire_order', target_values: [] },
  ])
  const [newRuleOperator, setNewRuleOperator] = useState<'include' | 'exclude'>('include')
  const [newRuleTargetType, setNewRuleTargetType] = useState<CustomRule['rule_target_type']>('category')
  const [newRuleValue, setNewRuleValue] = useState<string>('')

  // Targeting Rules State (legacy helpers)
  const [targetType, setTargetType] = useState<'entire_order' | 'category' | 'collection'>('entire_order')
  const [targetId, setTargetId] = useState<string>('')
  const [categories, setCategories] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])

  const handleAddRule = () => {
    let vals: string[] = []
    if (newRuleTargetType === 'entire_order' || newRuleTargetType === 'try_on_eligible') {
      vals = []
    } else if (newRuleTargetType === 'specific_sku') {
      vals = newRuleValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (vals.length === 0) return
    } else {
      if (!newRuleValue.trim()) return
      vals = [newRuleValue.trim()]
    }

    setRulesList((prev) => [
      ...prev,
      {
        id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        match_operator: newRuleOperator,
        rule_target_type: newRuleTargetType,
        target_values: vals,
      },
    ])
    setNewRuleValue('')
  }

  const handleRemoveRule = (id: string) => {
    setRulesList((prev) => prev.filter((r) => r.id !== id))
  }

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

  // Handle Banner Image Upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingBanner(true)
    setBannerUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'banners')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      const uploadedUrl = data.publicUrl || data.url
      if (res.ok && data.success && uploadedUrl) {
        setBannerImageUrl(uploadedUrl)
        setBannerUploadError(null)
      } else {
        setBannerUploadError(data.error || 'Failed to upload banner image')
      }
    } catch (err: any) {
      setBannerUploadError(err?.message || 'Error uploading banner file')
    } finally {
      setIsUploadingBanner(false)
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
      const rules = rulesList.map((r, index) => ({
        target_type: r.rule_target_type,
        rule_target_type: r.rule_target_type,
        target_id: r.target_values[0] || null,
        target_values: r.target_values,
        match_operator: r.match_operator,
        rule_group_id: `group_${index + 1}`,
      }))

      const coupons = []
      if (promotionType === 'coupon' && initialCouponCode.trim()) {
        coupons.push({
          code: initialCouponCode.trim().toUpperCase(),
          is_single_use: false,
          is_public: isPublicCoupon,
          max_uses: usageLimitTotal ? Number(usageLimitTotal) : null,
          is_active: true,
        })
      }

      // Infer routes from rules for nudge
      const inferredRoutes: string[] = ['*']
      const catRule = rulesList.find((r) => r.rule_target_type === 'category' && r.match_operator === 'include')
      if (catRule && catRule.target_values[0]) {
        const foundCat = categories.find((c) => c.id === catRule.target_values[0])
        if (foundCat?.slug) {
          inferredRoutes.push(`/shop?category=${foundCat.slug}`)
        }
      }

      const payload = {
        promotion: {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || null,
          banner_image_url: bannerImageUrl.trim() || null,
          promotion_type: promotionType,
          tier: tier,
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
        nudgeCampaign: promoteViaNudge ? {
          title: name.trim() || 'Storefront Promotion Nudge',
          headline: `Special Offer: ${name.trim() || 'Exclusive Privilege'}`,
          subheadline: `Unlock ${discountType === 'percentage' ? `${discountValue}% OFF` : `₹${discountValue} OFF`} on selected styles.`,
          surface_tier: nudgeSurfaceTier,
          position: 'bottom_right',
          trigger: 'scroll',
          trigger_scroll_percentage: 40,
          trigger_delay_seconds: 4,
          frequency: 'once_per_session',
          target_pages: inferredRoutes,
          primary_cta: {
            text: `Copy Code & Shop`,
            action: 'copy_and_apply',
            coupon_code: initialCouponCode.trim().toUpperCase() || undefined,
            link: '/shop',
            variant: 'primary',
          },
          secondary_cta: {
            text: 'Maybe Later',
            action: 'dismiss',
            variant: 'secondary',
          },
        } : undefined,
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
                    onChange={(e) => {
                      const t = e.target.value as any
                      setPromotionType(t)
                      if (t === 'coupon') setTier(2)
                      else if (t === 'tiered_threshold' || t === 'automatic_cart') setTier(3)
                    }}
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

              {/* 3-Tier Waterfall Architecture Selector */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                  <span>Discount Tier (Pricing Waterfall) *</span>
                  <span className="text-[10px] text-amber-500 font-mono">Myntra / Amazon Pattern</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTier(1)}
                    className={`p-3 text-left rounded border transition-colors ${
                      tier === 1
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400">Tier 1</span>
                      {tier === 1 && <span className="text-[10px] font-mono text-emerald-400 font-bold">ACTIVE</span>}
                    </div>
                    <div className="text-xs font-semibold mt-1">Catalog Markdown</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      Applies automatically on cards &amp; PDP. Zero coupon required.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTier(2)}
                    className={`p-3 text-left rounded border transition-colors ${
                      tier === 2
                        ? 'border-blue-500 bg-blue-500/10 text-foreground'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-400">Tier 2</span>
                      {tier === 2 && <span className="text-[10px] font-mono text-blue-400 font-bold">ACTIVE</span>}
                    </div>
                    <div className="text-xs font-semibold mt-1">Item / Category Coupon</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      Code required. Evaluated per qualifying item in cart.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTier(3)}
                    className={`p-3 text-left rounded border transition-colors ${
                      tier === 3
                        ? 'border-purple-500 bg-purple-500/10 text-foreground'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-400">Tier 3</span>
                      {tier === 3 && <span className="text-[10px] font-mono text-purple-400 font-bold">ACTIVE</span>}
                    </div>
                    <div className="text-xs font-semibold mt-1">Cart / Threshold</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      Cart-level reward when spend reaches required minimum.
                    </p>
                  </button>
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

          {/* Step 2: Background Banner & Visual Presentation */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                  2. Background Banner &amp; Photo Grid Presentation
                </h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                Card Background
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload an editorial background photo for the storefront &ldquo;Special Offers &amp; Sale&rdquo; photo grid and offers page.
            </p>

            {bannerImageUrl ? (
              <div className="relative w-full h-44 rounded-md overflow-hidden border border-border/80 group">
                <Image
                  src={bannerImageUrl}
                  alt="Promotion Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-white/20 text-white backdrop-blur-xs px-2 py-0.5 rounded-xs w-fit mb-1">
                    {promotionType === 'coupon' ? 'INVITATION CODE' : 'SEASONAL SALE'}
                  </span>
                  <h4 className="text-white font-sans font-bold text-base leading-tight">
                    {name || 'Privilege Preview'}
                  </h4>
                  <p className="text-white/80 text-xs font-mono">
                    {discountType === 'percentage'
                      ? `${discountValue}% OFF`
                      : discountType === 'free_shipping'
                        ? 'FREE SHIPPING'
                        : `₹${discountValue} OFF`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBannerImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20">
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {isUploadingBanner ? 'Uploading high-res asset...' : 'Click to Upload Banner Image'}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    JPEG, PNG, WebP or AVIF (Max 10 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleBannerUpload}
                    disabled={isUploadingBanner}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase shrink-0">
                    Or Image URL:
                  </span>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {bannerUploadError && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{bannerUploadError}</span>
              </div>
            )}
          </div>

          {/* Step 3: Discount Mechanism */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                3. Discount Mechanism &amp; Financials
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

          {/* Step 3: Upgraded Boolean Rule Groups (Include / Exclude) */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                  3. Boolean Catalog Rule Groups (Targeting)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {rulesList.length} Active Rule{rulesList.length === 1 ? '' : 's'}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Define Boolean inclusion and exclusion criteria. Multiple criteria combine via AND across target types, OR within the same type, with EXCLUDE rules strictly overriding INCLUDE rules.
            </p>

            {/* Existing Active Rules List */}
            <div className="space-y-2">
              {rulesList.map((rule) => {
                let targetLabel = 'All Garments'
                if (rule.rule_target_type === 'category' && rule.target_values[0]) {
                  const c = categories.find((cat) => cat.id === rule.target_values[0])
                  targetLabel = c ? `Category: ${c.name}` : `Category: ${rule.target_values[0]}`
                } else if (rule.rule_target_type === 'collection' && rule.target_values[0]) {
                  const col = collections.find((coll) => coll.id === rule.target_values[0])
                  targetLabel = col ? `Collection: ${col.title}` : `Collection: ${rule.target_values[0]}`
                } else if (rule.rule_target_type === 'subcategory') {
                  targetLabel = `Subcategory: ${rule.target_values.join(', ')}`
                } else if (rule.rule_target_type === 'try_on_eligible') {
                  targetLabel = '⚡ Bolt 45-Min Try-On Eligible Garments Only'
                } else if (rule.rule_target_type === 'specific_sku') {
                  targetLabel = `SKUs: ${rule.target_values.join(', ')}`
                }

                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 rounded border border-border/60 bg-background text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                          rule.match_operator === 'include'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {rule.match_operator === 'include' ? '+ INCLUDE' : '- EXCLUDE'}
                      </span>
                      <span className="font-semibold text-foreground">{targetLabel}</span>
                    </div>
                    {rulesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="text-muted-foreground hover:text-rose-400 p-1 transition-colors"
                        title="Remove rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add New Rule Row */}
            <div className="p-3.5 rounded border border-dashed border-border/80 bg-muted/10 space-y-3">
              <span className="text-[11px] font-mono font-semibold uppercase text-muted-foreground block">
                + Add Rule Condition
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                    Operator
                  </label>
                  <select
                    value={newRuleOperator}
                    onChange={(e) => setNewRuleOperator(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="include">INCLUDE (+)</option>
                    <option value="exclude">EXCLUDE (-)</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                    Target Type
                  </label>
                  <select
                    value={newRuleTargetType}
                    onChange={(e) => {
                      setNewRuleTargetType(e.target.value as any)
                      setNewRuleValue('')
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="entire_order">Entire Order (All Items)</option>
                    <option value="category">Category</option>
                    <option value="subcategory">Subcategory</option>
                    <option value="collection">Collection / Drop</option>
                    <option value="try_on_eligible">⚡ Bolt Try-On Eligible</option>
                    <option value="specific_sku">Specific SKUs</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                    Target Value
                  </label>
                  {newRuleTargetType === 'entire_order' || newRuleTargetType === 'try_on_eligible' ? (
                    <div className="h-8 flex items-center px-2 text-[11px] font-mono text-muted-foreground bg-muted/30 border border-border/40 rounded">
                      (Applies directly)
                    </div>
                  ) : newRuleTargetType === 'category' ? (
                    <select
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : newRuleTargetType === 'collection' ? (
                    <select
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose Collection --</option>
                      {collections.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  ) : newRuleTargetType === 'subcategory' ? (
                    <input
                      type="text"
                      placeholder="e.g. boxy-hoodies"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="HD-BOX-BLK-M, HD-BOX-BLK-L"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAddRule}
                    size="sm"
                    className="w-full font-mono text-xs h-8 bg-foreground text-background"
                  >
                    + Add
                  </Button>
                </div>
              </div>
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
              <div className="pt-2 space-y-3">
                <div>
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

                <div className="flex items-center justify-between p-3.5 rounded border border-border/60 bg-muted/20">
                  <div>
                    <div className="text-xs font-mono font-semibold flex items-center gap-2">
                      <span>Public Coupon (Auto-Discoverable)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {isPublicCoupon ? 'PUBLIC' : 'PRIVATE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">
                      When enabled, this coupon is auto-discovered on storefront product cards (&ldquo;Best Price ₹X with coupon {initialCouponCode || 'CODE'}&rdquo;) and the PDP 1-tap calculator. Private coupons require manual shopper input at checkout.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublicCoupon}
                    onChange={(e) => setIsPublicCoupon(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer shrink-0 ml-4"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 6: 1-Click Storefront Nudge Promotion */}
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                  6. Storefront Nudge Orchestration
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Non-Blocking UX
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded border border-amber-500/30 bg-amber-500/5">
              <div>
                <div className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  1-Click Promote via Storefront Nudge
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">
                  Automatically generate a non-blocking interactive nudge campaign linked to this promotion. Pre-populates headline, discount details, and 1-tap &ldquo;Copy &amp; Apply&rdquo; CTA.
                </p>
              </div>
              <input
                type="checkbox"
                checked={promoteViaNudge}
                onChange={(e) => setPromoteViaNudge(e.target.checked)}
                className="h-4 w-4 accent-amber-500 cursor-pointer shrink-0 ml-4"
              />
            </div>

            {promoteViaNudge && (
              <div className="space-y-4 p-4 rounded border border-border/60 bg-background/50 text-xs font-mono">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1.5">
                    Surface Tier (Form Factor)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNudgeSurfaceTier('bottom_sheet')}
                      className={`p-2.5 text-left rounded border transition-colors ${
                        nudgeSurfaceTier === 'bottom_sheet'
                          ? 'border-amber-500 bg-amber-500/10 text-foreground font-semibold'
                          : 'border-border/60 bg-muted/10 text-muted-foreground'
                      }`}
                    >
                      <div className="text-xs">Tier B: Bottom Sheet / Floating Pill</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Recommended (Non-blocking)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNudgeSurfaceTier('floating_pill')}
                      className={`p-2.5 text-left rounded border transition-colors ${
                        nudgeSurfaceTier === 'floating_pill'
                          ? 'border-amber-500 bg-amber-500/10 text-foreground font-semibold'
                          : 'border-border/60 bg-muted/10 text-muted-foreground'
                      }`}
                    >
                      <div className="text-xs">Desktop Floating Corner Pill</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Bottom right pill</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNudgeSurfaceTier('top_bar')}
                      className={`p-2.5 text-left rounded border transition-colors ${
                        nudgeSurfaceTier === 'top_bar'
                          ? 'border-amber-500 bg-amber-500/10 text-foreground font-semibold'
                          : 'border-border/60 bg-muted/10 text-muted-foreground'
                      }`}
                    >
                      <div className="text-xs">Tier A: Announcement Bar</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Top-of-page banner</div>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Nudge Preview</span>
                  <div className="font-semibold text-foreground">Special Offer: {name || 'Exclusive Privilege'}</div>
                  <p className="text-[11px] text-muted-foreground">
                    Unlock {discountType === 'percentage' ? `${discountValue}% OFF` : `₹${discountValue} OFF`} on selected styles.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px]">
                      CTA: Copy Code &amp; Apply
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Code: {initialCouponCode || 'Auto-generated'}
                    </span>
                  </div>
                </div>
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
