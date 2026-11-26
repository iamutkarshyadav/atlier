'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Trash2,
  UploadCloud,
  ImageIcon,
  X,
  Save,
  Check,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function EditPromotionPage() {
  const params = useParams()
  const router = useRouter()
  const promoId = params?.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Promotion Form State
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
  const [startsAt, setStartsAt] = useState<string>('')
  const [endsAt, setEndsAt] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [couponCode, setCouponCode] = useState<string>('')
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

  // Promotion Metadata & Stats
  const [redemptionsCount, setRedemptionsCount] = useState<number>(0)
  const [couponsList, setCouponsList] = useState<any[]>([])

  useEffect(() => {
    if (!promoId) return

    const loadPromo = async () => {
      setIsLoading(true)
      try {
        const [promoRes, catRes, colRes] = await Promise.all([
          fetch(`/api/admin/promotions/${promoId}`).then((r) => r.json()),
          fetch('/api/admin/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
          fetch('/api/admin/collections').then((r) => r.json()).catch(() => ({ collections: [] })),
        ])

        setCategories(catRes.categories || [])
        setCollections(colRes.collections || [])

        if (!promoRes.promotion) {
          setFormError(promoRes.error || 'Promotion not found')
          return
        }

        const p = promoRes.promotion
        setName(p.name || '')
        setSlug(p.slug || '')
        setDescription(p.description || '')
        setPromotionType(p.promotion_type || 'coupon')
        setTier(p.tier || (p.promotion_type === 'coupon' ? 2 : (p.promotion_type === 'tiered_threshold' ? 3 : 1)))
        setDiscountType(p.discount_type || 'percentage')
        setDiscountValue(Number(p.discount_value) || 0)
        setMaxDiscountAmount(p.max_discount_amount !== null ? Number(p.max_discount_amount) : '')
        setMinOrderSubtotal(p.min_order_subtotal !== null ? Number(p.min_order_subtotal) : '')
        setEnforceMarginFloor(Boolean(p.enforce_margin_floor))
        setIsStackable(Boolean(p.is_stackable))
        setUsageLimitTotal(p.usage_limit_total !== null ? Number(p.usage_limit_total) : '')
        setUsageLimitPerCustomer(p.usage_limit_per_customer !== null ? Number(p.usage_limit_per_customer) : '')
        setPriority(Number(p.priority) || 10)
        setStartsAt(p.starts_at ? new Date(p.starts_at).toISOString().slice(0, 16) : '')
        setEndsAt(p.ends_at ? new Date(p.ends_at).toISOString().slice(0, 16) : '')
        setIsActive(Boolean(p.is_active))
        setBannerImageUrl(p.banner_image_url || '')
        setRedemptionsCount(Number(p.total_redemptions_count) || 0)

        const activeCoupons = p.coupons || []
        setCouponsList(activeCoupons)
        if (activeCoupons.length > 0) {
          setCouponCode(activeCoupons[0].code || '')
          setIsPublicCoupon(Boolean(activeCoupons[0].is_public))
        }

        if (Array.isArray(p.rules) && p.rules.length > 0) {
          setRulesList(
            p.rules.map((r: any, idx: number) => ({
              id: r.id || `rule_${idx + 1}`,
              match_operator: r.match_operator || 'include',
              rule_target_type: r.rule_target_type || r.target_type || 'entire_order',
              target_values: r.target_values && r.target_values.length > 0 ? r.target_values : (r.target_id ? [r.target_id] : []),
            }))
          )
        }
      } catch (err: any) {
        setFormError(err?.message || 'Failed to load promotion')
      } finally {
        setIsLoading(false)
      }
    }

    loadPromo()
  }, [promoId])

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!name.trim()) {
      setFormError('Please enter a campaign title')
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

      // Infer routes from rules for nudge
      const inferredRoutes: string[] = ['*']
      const catRule = rulesList.find((r) => r.rule_target_type === 'category' && r.match_operator === 'include')
      if (catRule && catRule.target_values[0]) {
        const foundCat = categories.find((c) => c.id === catRule.target_values[0])
        if (foundCat?.slug) {
          inferredRoutes.push(`/shop?category=${foundCat.slug}`)
        }
      }

      const payload: any = {
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
        is_active: isActive,
        priority: Number(priority) || 10,
        rules: rules,
        isPublicCoupon: isPublicCoupon,
      }

      if (promoteViaNudge) {
        payload.nudgeCampaign = {
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
            coupon_code: couponCode.trim().toUpperCase() || undefined,
            link: '/shop',
            variant: 'primary',
          },
          secondary_cta: {
            text: 'Maybe Later',
            action: 'dismiss',
            variant: 'secondary',
          },
        }
      }

      if (startsAt) {
        payload.starts_at = new Date(startsAt).toISOString()
      }
      if (endsAt) {
        payload.ends_at = new Date(endsAt).toISOString()
      } else {
        payload.ends_at = null
      }

      if (promotionType === 'coupon' && couponCode.trim()) {
        payload.couponCode = couponCode.trim().toUpperCase()
      }

      const res = await fetch(`/api/admin/promotions/${promoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save promotion')
      }

      setSuccessMsg('Promotion privilege saved successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setFormError(err?.message || 'Error saving changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this promotion campaign and associated coupons?')) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/promotions/${promoId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/promotions')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete promotion')
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting promotion')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-xs font-mono text-muted-foreground">Loading promotion details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/promotions"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold font-mono uppercase tracking-tight">
                Edit Privilege: {name}
              </h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase rounded ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Refine discount rates, coupon codes, and high-fashion background imagery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-mono text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="font-mono text-xs bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
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

      {successMsg && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Campaign Identity */}
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
              1. Campaign Identity &amp; Status
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Campaign Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                URL Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Promotion Type
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
                <option value="automatic_cart">Automatic Cart Privilege / Sale</option>
                <option value="tiered_threshold">Tiered Order Threshold</option>
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

          <div className="pt-2 border-t border-border/40">

            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Live Campaign Status
              </label>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded border transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border/60'
                  }`}
                >
                  {isActive ? '✓ Campaign Live' : 'Paused / Inactive'}
                </button>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Redemptions: {redemptionsCount}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-muted-foreground uppercase">
              Description / Editorial Note
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Section 2: Background Image Upload */}
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                2. Card Background &amp; Editorial Photo
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Storefront Photo Grid
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            The photo rendered as the luxury card background in the &ldquo;Special Offers &amp; Sale&rdquo; photo grid on the homepage and /offers.
          </p>

          {bannerImageUrl ? (
            <div className="relative w-full h-48 rounded-md overflow-hidden border border-border/80 group">
              <Image
                src={bannerImageUrl}
                alt={name || 'Promotion Banner'}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 flex flex-col justify-end">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-white/20 text-white backdrop-blur-xs px-2.5 py-0.5 rounded-xs w-fit mb-1.5">
                  {promotionType === 'coupon' ? `CODE: ${couponCode || 'PROMO'}` : 'OFFER'}
                </span>
                <h4 className="text-white font-sans font-bold text-lg leading-tight">
                  {name || 'Privilege Preview'}
                </h4>
                <p className="text-white/80 text-xs font-mono mt-0.5">
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
                  {isUploadingBanner ? 'Uploading high-res asset...' : 'Upload Editorial Photo'}
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

        {/* Section 3: Coupon Code (if applicable) */}
        {promotionType === 'coupon' && (
          <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                3. Invitation / Coupon Code
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Primary Public Alphanumeric Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. FESTIVE20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-widest font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground uppercase">
                  Max Redemptions Cap
                </label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  value={usageLimitTotal}
                  onChange={(e) =>
                    setUsageLimitTotal(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
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
                  When enabled, this coupon is auto-discovered on storefront product cards (&ldquo;Best Price ₹X with coupon {couponCode || 'CODE'}&rdquo;) and the PDP 1-tap calculator.
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

        {/* Section: Boolean Catalog Rule Groups (Targeting) */}
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                Catalog Targeting Rules
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {rulesList.length} Active Rule{rulesList.length === 1 ? '' : 's'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Define Boolean inclusion and exclusion criteria. Multiple criteria combine via AND across target types, OR within the same type, with EXCLUDE rules strictly overriding INCLUDE rules.
          </p>

          {/* Active Rules List */}
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

        {/* Section 4: Discount Mechanism */}
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
              {promotionType === 'coupon' ? '4' : '3'}. Discount Calculations &amp; Limits
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (₹)</option>
                <option value="free_shipping">Free Shipping Waiver</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Discount Value *
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Min Order Subtotal (₹)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minOrderSubtotal}
                onChange={(e) =>
                  setMinOrderSubtotal(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div>
              <span className="text-xs font-mono font-semibold">Margin-Floor Guard</span>
              <p className="text-[11px] text-muted-foreground">
                Prevents selling prices from dipping below garment production cost.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnforceMarginFloor(!enforceMarginFloor)}
              className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                enforceMarginFloor
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border/60'
              }`}
            >
              {enforceMarginFloor ? 'Active' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Section 5: Dates & Priority */}
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
              {promotionType === 'coupon' ? '5' : '4'}. Validity Schedule
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Starts At
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground uppercase">
                Ends At (Leave empty for ongoing)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Section: 1-Click Storefront Nudge Promotion */}
        <div className="p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
                Storefront Nudge Orchestration
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
                    Code: {couponCode || 'Auto-generated'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Link href="/promotions">
            <Button type="button" variant="outline" className="font-mono text-xs">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="font-mono text-xs bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
