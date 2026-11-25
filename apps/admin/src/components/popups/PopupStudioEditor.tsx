'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Layers,
  Save,
  UploadCloud,
  ImageIcon,
  X,
  Sparkles,
  Tag,
  Star,
  Sliders,
  Smartphone,
  Monitor,
  Copy,
  ExternalLink,
  Clock,
  MousePointer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Check,
} from 'lucide-react'
import type { PopupCampaign, PopupType, PopupTrigger, PopupPosition, PopupFrequency } from '@repo/supabase'

interface PopupStudioEditorProps {
  initialData?: PopupCampaign | null
  isEditing?: boolean
}

export function PopupStudioEditor({ initialData, isEditing = false }: PopupStudioEditorProps) {
  const router = useRouter()

  // Form State
  const [title, setTitle] = useState(initialData?.title || 'New Pop-Up Campaign')
  const [type, setType] = useState<PopupType>(initialData?.type || 'sale')
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true)
  const [badgeText, setBadgeText] = useState(initialData?.badge_text || 'LIMITED TIME OFFER')
  const [headline, setHeadline] = useState(initialData?.headline || 'Special Seasonal Offer')
  const [subheadline, setSubheadline] = useState(
    initialData?.subheadline || 'Enjoy exclusive savings across curated silhouettes and essentials.'
  )
  const [content, setContent] = useState(initialData?.content || '')
  const [bannerImageUrl, setBannerImageUrl] = useState(
    initialData?.banner_image_url ||
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80'
  )
  const [position, setPosition] = useState<PopupPosition>(initialData?.position || 'center_modal')
  const [trigger, setTrigger] = useState<PopupTrigger>(initialData?.trigger || 'delay')
  const [triggerDelaySeconds, setTriggerDelaySeconds] = useState<number>(
    initialData?.trigger_delay_seconds ?? 3
  )
  const [triggerScrollPercentage, setTriggerScrollPercentage] = useState<number>(
    initialData?.trigger_scroll_percentage ?? 30
  )
  const [targetPagesString, setTargetPagesString] = useState<string>(
    initialData?.target_pages?.join(', ') || '*'
  )
  const [frequency, setFrequency] = useState<PopupFrequency>(
    initialData?.frequency || 'once_per_session'
  )
  const [startsAt, setStartsAt] = useState<string>(initialData?.start_at || '')
  const [endsAt, setEndsAt] = useState<string>(initialData?.end_at || '')

  // CTA State
  const [primaryCtaText, setPrimaryCtaText] = useState(initialData?.primary_cta?.text || 'Explore Offer')
  const [primaryCtaAction, setPrimaryCtaAction] = useState<
    'navigate' | 'copy_code' | 'open_review' | 'dismiss'
  >(initialData?.primary_cta?.action || 'navigate')
  const [primaryCtaLink, setPrimaryCtaLink] = useState(initialData?.primary_cta?.link || '/shop')
  const [primaryCtaCode, setPrimaryCtaCode] = useState(
    initialData?.primary_cta?.coupon_code || 'CURATOR26'
  )

  const [hasSecondaryCta, setHasSecondaryCta] = useState<boolean>(Boolean(initialData?.secondary_cta))
  const [secondaryCtaText, setSecondaryCtaText] = useState(
    initialData?.secondary_cta?.text || 'Maybe Later'
  )
  const [secondaryCtaAction, setSecondaryCtaAction] = useState<'dismiss' | 'navigate'>(
    (initialData?.secondary_cta?.action as any) || 'dismiss'
  )
  const [secondaryCtaLink, setSecondaryCtaLink] = useState(
    initialData?.secondary_cta?.link || ''
  )

  // Upload & Submission State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Live Preview Device Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [testCopied, setTestCopied] = useState(false)

  // Quick preset loader based on type
  const applyTypePreset = (newType: PopupType) => {
    setType(newType)
    if (newType === 'sale') {
      setBadgeText('LIMITED TIME OFFER')
      setHeadline('Unlock ₹2,500 Off Your Order')
      setSubheadline('Apply code CURATOR26 at checkout on orders exceeding ₹15,000.')
      setPrimaryCtaText('Copy Code & Shop')
      setPrimaryCtaAction('copy_code')
      setPrimaryCtaCode('CURATOR26')
      setPrimaryCtaLink('/shop')
      setPosition('center_modal')
      setTrigger('delay')
      setTriggerDelaySeconds(3)
    } else if (newType === 'feature') {
      setBadgeText('FEATURE SPOTLIGHT')
      setHeadline('Bolt 45-Min Doorstep Try-On')
      setSubheadline('Try up to 3 sizes in the comfort of your home. Keep what fits, return the rest.')
      setPrimaryCtaText('Try Bolt Now')
      setPrimaryCtaAction('navigate')
      setPrimaryCtaLink('/shop')
      setPosition('bottom_right')
      setTrigger('scroll')
      setTriggerScrollPercentage(35)
    } else if (newType === 'review') {
      setBadgeText('VERIFIED FEEDBACK')
      setHeadline('How Did Your Recent Delivery Fit?')
      setSubheadline('Help fellow shoppers find their perfect size by sharing fabric drape and fit feedback.')
      setPrimaryCtaText('Rate Delivered Orders')
      setPrimaryCtaAction('navigate')
      setPrimaryCtaLink('/orders')
      setPosition('bottom_right')
      setTrigger('immediate')
      setTargetPagesString('/orders')
    }
  }

  // Handle Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'popups')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      const publicUrl = data.publicUrl || data.url
      if (res.ok && data.success && publicUrl) {
        setBannerImageUrl(publicUrl)
      } else {
        setUploadError(data.error || 'Failed to upload image')
      }
    } catch {
      setUploadError('Network error uploading banner file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const target_pages = targetPagesString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload: Partial<PopupCampaign> = {
      title: title.trim(),
      type,
      is_active: isActive,
      badge_text: badgeText.trim(),
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      content: content.trim(),
      banner_image_url: bannerImageUrl.trim(),
      position,
      trigger,
      trigger_delay_seconds: Number(triggerDelaySeconds) || 0,
      trigger_scroll_percentage: Number(triggerScrollPercentage) || 0,
      target_pages: target_pages.length > 0 ? target_pages : ['*'],
      frequency,
      start_at: startsAt || null,
      end_at: endsAt || null,
      primary_cta: {
        text: primaryCtaText.trim(),
        action: primaryCtaAction,
        link: primaryCtaLink.trim(),
        coupon_code: primaryCtaAction === 'copy_code' ? primaryCtaCode.trim() : undefined,
        variant: 'primary',
      },
      secondary_cta: hasSecondaryCta
        ? {
            text: secondaryCtaText.trim(),
            action: secondaryCtaAction,
            link: secondaryCtaAction === 'navigate' ? secondaryCtaLink.trim() : undefined,
            variant: 'secondary',
          }
        : undefined,
    }

    try {
      const endpoint = isEditing && initialData?.id
        ? `/api/admin/popups/${initialData.id}`
        : '/api/admin/popups'
      const method = isEditing && initialData?.id ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSaveSuccess(true)
        setTimeout(() => {
          router.push('/popups')
        }, 1200)
      } else {
        setSaveError(data.error || 'Failed to save popup campaign')
      }
    } catch {
      setSaveError('Network error saving campaign')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/popups"
            className="p-1.5 border border-border rounded-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                Pop-Up Studio
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-semibold text-foreground">
                {isEditing ? 'Edit Campaign' : 'Create Campaign'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground mt-0.5">{title || 'Untitled Campaign'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Status Switcher */}
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1.5 rounded-xs text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-chrome-850 text-zinc-400 border-chrome-750 hover:bg-chrome-800 hover:text-foreground'
            }`}
          >
            {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>{isActive ? 'Active Campaign' : 'Draft Only'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-1.5 bg-chrome-850 hover:bg-chrome-800 text-foreground border border-chrome-750 dark:bg-zinc-100 dark:text-zinc-900 dark:border-transparent dark:hover:bg-zinc-200 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-sm text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Campaign saved successfully! Returning to Pop-Up Studio...</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-sm text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Split Studio Grid: Controls on Left, Device Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN: Studio Controls (7 cols)
           ========================================================================= */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Section 1: Campaign Intent & Category */}
          <div className="p-5 bg-chrome-900 border border-chrome-800 rounded-sm space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-chrome-800">
              <Sliders className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                1. Campaign Details & Goal
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Internal Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Curator Private Sale Q1"
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Campaign Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['sale', 'feature', 'review'] as PopupType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyTypePreset(t)}
                      className={`p-1.5 rounded-xs text-center border text-[11px] font-mono capitalize transition-all cursor-pointer ${
                        type === t
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-chrome-800 bg-chrome-950 text-zinc-400 hover:border-chrome-750 hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Copywriting Fields */}
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Badge Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. EXCLUSIVE PROMOTION, FEATURE SPOTLIGHT, VERIFIED FEEDBACK"
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Headline Text
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Unlock ₹2,500 Off Your Order"
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs font-semibold text-foreground focus:border-chrome-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Subheadline / Body Text
                </label>
                <textarea
                  rows={2}
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  placeholder="Brief descriptive message displayed under the headline..."
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Banner Image & Visual Presentation */}
          <div className="p-5 bg-chrome-900 border border-chrome-800 rounded-sm space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-chrome-800">
              <ImageIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                2. Visual Banner & Placement
              </h3>
            </div>

            {/* Banner Upload Box */}
            <div className="space-y-3 text-xs">
              <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold">
                Cover / Banner Photo
              </label>

              <div className="flex items-center gap-4">
                {bannerImageUrl ? (
                  <div className="relative w-36 h-24 rounded-xs border border-chrome-750 overflow-hidden shrink-0 group">
                    <Image src={bannerImageUrl} alt="Banner preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setBannerImageUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-36 h-24 rounded-xs border border-dashed border-chrome-750 flex flex-col items-center justify-center text-muted-foreground bg-chrome-950 shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[10px] font-mono">No Image</span>
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-chrome-750 rounded-xs hover:border-chrome-700 text-xs font-mono font-medium cursor-pointer transition-colors bg-chrome-950">
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  <div>
                    <span className="text-[10px] text-muted-foreground block font-mono">Or paste image URL:</span>
                    <input
                      type="url"
                      value={bannerImageUrl}
                      onChange={(e) => setBannerImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-1.5 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden mt-1"
                    />
                  </div>
                </div>
              </div>

              {uploadError && (
                <p className="text-xs text-rose-600 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {uploadError}
                </p>
              )}
            </div>

            {/* Position Selector */}
            <div className="pt-2 border-t border-chrome-800 space-y-2">
              <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold">
                Display Position & Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'center_modal', label: 'Center Modal', desc: 'Overlay with backdrop' },
                  { id: 'bottom_right', label: 'Bottom Right', desc: 'Floating corner drawer' },
                  { id: 'bottom_bar', label: 'Bottom Bar', desc: 'Full width sticky bar' },
                  { id: 'top_banner', label: 'Top Banner', desc: 'Subtle announcement strip' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id as PopupPosition)}
                    className={`p-2 rounded-xs border text-left transition-all cursor-pointer ${
                      position === pos.id
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                        : 'border-chrome-800 bg-chrome-950 text-zinc-400 hover:border-chrome-750 hover:text-foreground'
                    }`}
                  >
                    <div className="font-semibold text-xs">{pos.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        position === pos.id ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'
                      }`}
                    >
                      {pos.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Call-To-Action (CTA) Builder */}
          <div className="p-5 bg-chrome-900 border border-chrome-800 rounded-sm space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-chrome-800">
              <Tag className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                3. Call-To-Action (CTA) & Interaction
              </h3>
            </div>

            {/* Primary CTA */}
            <div className="space-y-3 text-xs">
              <div className="font-semibold text-xs text-foreground">Primary Action Button</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryCtaText}
                    onChange={(e) => setPrimaryCtaText(e.target.value)}
                    placeholder="e.g. Shop the Sale"
                    className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                    Button Action
                  </label>
                  <select
                    value={primaryCtaAction}
                    onChange={(e) => setPrimaryCtaAction(e.target.value as any)}
                    className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                  >
                    <option value="navigate">Navigate to URL</option>
                    <option value="copy_code">Copy Coupon Code & Go</option>
                    <option value="dismiss">Dismiss Pop-Up</option>
                  </select>
                </div>

                {primaryCtaAction === 'copy_code' ? (
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                      Coupon Code
                    </label>
                    <input
                      type="text"
                      value={primaryCtaCode}
                      onChange={(e) => setPrimaryCtaCode(e.target.value)}
                      placeholder="e.g. CURATOR26"
                      className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs font-mono font-bold text-foreground focus:border-chrome-700 focus:outline-hidden uppercase"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                      Destination URL
                    </label>
                    <input
                      type="text"
                      value={primaryCtaLink}
                      onChange={(e) => setPrimaryCtaLink(e.target.value)}
                      placeholder="/shop or /orders"
                      className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="pt-3 border-t border-chrome-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-xs text-foreground">Secondary Dismiss / Alt Button</div>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-mono">
                  <input
                    type="checkbox"
                    checked={hasSecondaryCta}
                    onChange={(e) => setHasSecondaryCta(e.target.checked)}
                    className="rounded-xs"
                  />
                  <span>Enable Secondary Action</span>
                </label>
              </div>

              {hasSecondaryCta && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={secondaryCtaText}
                      onChange={(e) => setSecondaryCtaText(e.target.value)}
                      placeholder="e.g. Maybe Later"
                      className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                      Action
                    </label>
                    <select
                      value={secondaryCtaAction}
                      onChange={(e) => setSecondaryCtaAction(e.target.value as any)}
                      className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                    >
                      <option value="dismiss">Dismiss Pop-Up</option>
                      <option value="navigate">Navigate to URL</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Trigger Rules, Targeting & Frequency */}
          <div className="p-5 bg-chrome-900 border border-chrome-800 rounded-sm space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-chrome-800">
              <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                4. Trigger Timing, Page Target & Frequency
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Trigger Type */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Launch Trigger
                </label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as PopupTrigger)}
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                >
                  <option value="immediate">Immediate on Page Load</option>
                  <option value="delay">Time Delay (Seconds)</option>
                  <option value="scroll">Scroll Depth Percentage</option>
                  <option value="exit_intent">Exit Intent (Mouse Leaves Top)</option>
                </select>
              </div>

              {/* Trigger Variable */}
              {trigger === 'delay' && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                    Delay: {triggerDelaySeconds} seconds
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={triggerDelaySeconds}
                    onChange={(e) => setTriggerDelaySeconds(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}

              {trigger === 'scroll' && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                    Scroll Depth: {triggerScrollPercentage}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={triggerScrollPercentage}
                    onChange={(e) => setTriggerScrollPercentage(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-chrome-800">
              {/* Target Pages */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Target Routes (Comma-separated)
                </label>
                <input
                  type="text"
                  value={targetPagesString}
                  onChange={(e) => setTargetPagesString(e.target.value)}
                  placeholder="* (All), /, /shop, /orders, /products/*"
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs font-mono text-foreground focus:border-chrome-700 focus:outline-hidden"
                />
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                  Use * for all pages, or specific paths like /orders, /shop.
                </span>
              </div>

              {/* Frequency Capping */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground font-bold mb-1">
                  Visitor Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as PopupFrequency)}
                  className="w-full bg-chrome-950 border border-chrome-750 rounded-xs p-2 text-xs text-foreground focus:border-chrome-700 focus:outline-hidden"
                >
                  <option value="once_per_session">Once Per Browser Session (Recommended)</option>
                  <option value="once_per_user">Once Per Visitor Ever (Local Storage)</option>
                  <option value="always">Always on Every Page Visit</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* =========================================================================
            RIGHT COLUMN: Real-Time Interactive Live Preview (5 cols sticky)
           ========================================================================= */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              <Eye className="w-4 h-4 text-foreground" />
              <span>Live Storefront Preview</span>
            </div>

            {/* Viewport device switcher */}
            <div className="flex items-center gap-1 border border-border rounded-xs p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1 rounded-2xs text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1 rounded-2xs text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>

          {/* Device Frame Simulator */}
          <div
            className={`mx-auto border-2 border-chrome-800 rounded-sm bg-chrome-950 shadow-xl overflow-hidden transition-all duration-300 relative ${
              previewDevice === 'mobile' ? 'max-w-[340px] h-[580px]' : 'w-full h-[540px]'
            }`}
          >
            {/* Fake Storefront Background */}
            <div className="absolute inset-0 bg-[#f8f9fa] opacity-60 pointer-events-none p-4 space-y-3 select-none">
              <div className="h-6 w-32 bg-neutral-300 rounded-xs" />
              <div className="h-28 w-full bg-neutral-200 rounded-xs" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-24 bg-neutral-200 rounded-xs" />
                <div className="h-24 bg-neutral-200 rounded-xs" />
              </div>
            </div>

            {/* Backdrop for center_modal */}
            {position === 'center_modal' && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs z-10 flex items-center justify-center p-3 sm:p-4">
                {/* Modal Card */}
                <div className="bg-white text-[#14293a] border border-[#d3d6db] rounded-sm w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 font-sans">
                  {/* Close button */}
                  <div className="absolute top-2.5 right-2.5 z-20">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {bannerImageUrl && (
                    <div className="relative h-36 w-full bg-neutral-100 overflow-hidden">
                      <Image src={bannerImageUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}

                  <div className="p-4 sm:p-5 space-y-3">
                    {badgeText && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#b91c1c] font-bold block">
                        {badgeText}
                      </span>
                    )}
                    <h3 className="font-bold text-base leading-tight text-neutral-900">{headline}</h3>
                    {subheadline && (
                      <p className="text-xs text-[#6c7079] leading-relaxed">{subheadline}</p>
                    )}

                    {primaryCtaAction === 'copy_code' && primaryCtaCode && (
                      <div className="p-2.5 bg-neutral-50 border border-dashed border-[#d3d6db] rounded-xs flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-[#6c7079] font-mono block">
                            PROMO CODE
                          </span>
                          <span className="font-mono font-bold text-xs text-neutral-900">
                            {primaryCtaCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTestCopied(true)
                            setTimeout(() => setTestCopied(false), 2000)
                          }}
                          className="px-2 py-1 bg-neutral-900 text-white text-[10px] font-mono rounded-xs flex items-center gap-1 cursor-pointer"
                        >
                          {testCopied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{testCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{primaryCtaText}</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>

                      {hasSecondaryCta && (
                        <button
                          type="button"
                          className="w-full py-1.5 text-xs text-[#6c7079] hover:text-neutral-900 transition-colors cursor-pointer text-center"
                        >
                          {secondaryCtaText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Corner Drawer for bottom_right */}
            {position === 'bottom_right' && (
              <div className="absolute bottom-3 right-3 z-10 w-[280px] bg-white border border-[#d3d6db] rounded-sm shadow-2xl overflow-hidden font-sans animate-in slide-in-from-bottom-3 duration-200">
                <div className="p-3 bg-neutral-50 border-b border-[#e5e7eb] flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase font-bold text-[#b91c1c]">
                    {badgeText || 'SPOTLIGHT'}
                  </span>
                  <X className="w-3.5 h-3.5 text-[#8a909a] cursor-pointer" />
                </div>
                <div className="p-3.5 space-y-2">
                  <h4 className="font-bold text-xs text-neutral-900 leading-snug">{headline}</h4>
                  <p className="text-[11px] text-[#6c7079] line-clamp-2">{subheadline}</p>
                  <button
                    type="button"
                    className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-semibold rounded-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <span>{primaryCtaText}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floating bar for bottom_bar */}
            {position === 'bottom_bar' && (
              <div className="absolute bottom-0 inset-x-0 z-10 bg-white border-t border-[#d3d6db] p-3 flex items-center justify-between gap-3 shadow-lg font-sans">
                <div className="truncate">
                  <div className="text-2xs font-mono uppercase font-bold text-[#b91c1c]">
                    {badgeText || 'SPECIAL OFFER'}
                  </div>
                  <div className="text-xs font-bold text-neutral-900 truncate">{headline}</div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xs shrink-0"
                >
                  {primaryCtaText}
                </button>
              </div>
            )}

            {/* Top notification for top_banner */}
            {position === 'top_banner' && (
              <div className="absolute top-0 inset-x-0 z-10 bg-neutral-900 text-white px-3 py-2 flex items-center justify-between gap-2 shadow-sm font-sans text-xs">
                <span className="truncate font-medium">{headline}</span>
                <button
                  type="button"
                  className="px-2 py-0.5 bg-white text-neutral-900 text-[10px] font-bold rounded-2xs shrink-0"
                >
                  {primaryCtaText}
                </button>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-muted/40 border border-border rounded-xs text-[11px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Trigger: {trigger}</span>
            <span>Target: {targetPagesString || '*'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
