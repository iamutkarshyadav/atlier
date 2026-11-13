'use client'

import React, { useState, useEffect } from 'react'
import {
  Palette,
  Save,
  RefreshCw,
  Sparkles,
  Sliders,
  Check,
  Type,
  Layout,
  Layers,
  Zap,
} from 'lucide-react'
import { Button } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getStorefrontTokens,
  upsertStorefrontTokens,
  DEFAULT_STOREFRONT_TOKENS,
  type StorefrontTokens,
} from '@repo/supabase/utils'
import { triggerStorefrontRevalidation } from '@/lib/revalidate'

export function TokenStudio() {
  const [tokens, setTokens] = useState<Record<string, string>>(
    DEFAULT_STOREFRONT_TOKENS.tokens_json as Record<string, string>
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadTokens = async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()
      const fetched = await getStorefrontTokens(supabase, 'default')
      if (fetched && fetched.tokens_json && typeof fetched.tokens_json === 'object') {
        setTokens(fetched.tokens_json as Record<string, string>)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTokens()
  }, [])

  const updateToken = (key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveTokens = async () => {
    setIsSaving(true)
    try {
      const supabase = createBrowserClient()
      const res = await upsertStorefrontTokens(supabase, {
        theme_name: 'default',
        tokens_json: tokens,
        is_active: true,
      })

      if (!res.success) {
        showToast(`Save Error: ${res.error}`)
        return
      }

      // Purge storefront ISR cache
      await triggerStorefrontRevalidation({ path: '/' })

      // Broadcast Realtime Event
      try {
        const channel = supabase.channel('cms_storefront_tokens')
        await channel.send({
          type: 'broadcast',
          event: 'tokens_update',
          payload: tokens,
        })
      } catch (e) {
        console.warn('Token broadcast note:', e)
      }

      showToast('Storefront design tokens deployed! Realtime theme active.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Reset tokens back to factory luxury default?')) {
      setTokens(DEFAULT_STOREFRONT_TOKENS.tokens_json as Record<string, string>)
      showToast('Restored default theme tokens')
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs pb-8">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-chrome-900 border border-chrome-800">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>Storefront Global Design Tokens Studio</span>
          </h2>
          <p className="text-2xs text-zinc-400">
            Control brand colors, typography stacks, border radii, and spacing variables across the storefront
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="terminal"
            size="sm"
            onClick={handleResetDefaults}
            className="h-7 text-3xs border-chrome-750 text-zinc-400"
          >
            Reset Defaults
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSaveTokens}
            isLoading={isSaving}
            className="h-7 px-3 text-2xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-none flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Deploy Tokens Live
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-2.5 bg-chrome-850 border border-emerald-500/70 text-emerald-300 text-xs flex justify-between items-center shadow-lg">
          <span className="font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Token Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Color Palette Tokens */}
          <div className="bg-chrome-900 border border-chrome-800 p-4 space-y-3">
            <span className="text-3xs uppercase tracking-wider text-zinc-400 font-bold block border-b border-chrome-800 pb-2">
              Brand Color Tokens
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
              {[
                { label: 'Storefront Canvas Background', key: '--background', defaultVal: '#FAFAFA' },
                { label: 'Text Foreground / Ink', key: '--foreground', defaultVal: '#0A0A0C' },
                { label: 'Primary Brand / Buttons', key: '--primary', defaultVal: '#0A0A0C' },
                { label: 'Primary Button Text', key: '--primary-foreground', defaultVal: '#FFFFFF' },
                { label: 'Secondary / Card Surface', key: '--secondary', defaultVal: '#F4F4F5' },
                { label: 'Accent Atelier Green', key: '--accent-green', defaultVal: '#166534' },
                { label: 'Accent Bolt Gold', key: '--accent-gold', defaultVal: '#F59E0B' },
                { label: 'Structural Border', key: '--border', defaultVal: '#E4E4E7' },
              ].map((token) => (
                <div key={token.key} className="space-y-1">
                  <label className="text-3xs uppercase text-zinc-400 block font-semibold">
                    {token.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tokens[token.key]?.startsWith('#') ? tokens[token.key] : token.defaultVal}
                      onChange={(e) => updateToken(token.key, e.target.value)}
                      className="w-7 h-7 bg-transparent border border-chrome-750 cursor-pointer p-0 rounded-none shrink-0"
                    />
                    <input
                      type="text"
                      value={tokens[token.key] || token.defaultVal}
                      onChange={(e) => updateToken(token.key, e.target.value)}
                      className="w-full bg-chrome-950 border border-chrome-750 px-2 py-1 text-2xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Typography & Radius Tokens */}
          <div className="bg-chrome-900 border border-chrome-800 p-4 space-y-3">
            <span className="text-3xs uppercase tracking-wider text-zinc-400 font-bold block border-b border-chrome-800 pb-2">
              Typography & Radii Tokens
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 block font-semibold">
                  Serif Font Stack (--font-serif)
                </label>
                <input
                  type="text"
                  value={tokens['--font-serif'] || 'Cormorant Garamond, Georgia, serif'}
                  onChange={(e) => updateToken('--font-serif', e.target.value)}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-2xs text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 block font-semibold">
                  Sans-Serif Font Stack (--font-sans)
                </label>
                <input
                  type="text"
                  value={tokens['--font-sans'] || 'Inter, -apple-system, sans-serif'}
                  onChange={(e) => updateToken('--font-sans', e.target.value)}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-2xs text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs uppercase text-zinc-400 block font-semibold">
                  Structural Border Radius (--radius)
                </label>
                <select
                  value={tokens['--radius'] || '0px'}
                  onChange={(e) => updateToken('--radius', e.target.value)}
                  className="w-full bg-chrome-950 border border-chrome-750 px-2.5 py-1.5 text-2xs text-zinc-100 font-mono"
                >
                  <option value="0px">0px &bull; Sharp Industrial Luxury</option>
                  <option value="2px">2px &bull; Subtle Micro-Radius</option>
                  <option value="4px">4px &bull; Rounded Precision</option>
                  <option value="8px">8px &bull; Modern Soft</option>
                  <option value="16px">16px &bull; Playful Curved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Storefront Theme Swatch Preview (5 Cols) */}
        <div className="lg:col-span-5 bg-chrome-900 border border-chrome-800 p-4 space-y-4">
          <span className="text-3xs uppercase tracking-wider text-zinc-400 font-bold block border-b border-chrome-800 pb-2">
            Live Theme Token Swatch Preview
          </span>

          {/* Interactive Swatch Surface using tokens */}
          <div
            className="p-6 transition-all shadow-xl space-y-6"
            style={{
              backgroundColor: tokens['--background'] || '#FAFAFA',
              color: tokens['--foreground'] || '#0A0A0C',
              border: `2px solid ${tokens['--border'] || '#E4E4E7'}`,
              borderRadius: tokens['--radius'] || '0px',
              fontFamily: tokens['--font-sans'] || 'sans-serif',
            }}
          >
            {/* Header Mock */}
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: tokens['--border'] || '#E4E4E7' }}>
              <div>
                <h4
                  className="text-lg font-light tracking-wide uppercase leading-none"
                  style={{ fontFamily: tokens['--font-serif'] || 'serif' }}
                >
                  ATELIER
                </h4>
                <span className="text-[8px] uppercase tracking-widest text-neutral-500 font-mono">
                  DROP 01 SPEC
                </span>
              </div>
              <span
                className="px-2 py-0.5 text-[9px] font-mono uppercase font-bold"
                style={{
                  backgroundColor: tokens['--accent-green'] || '#166534',
                  color: '#FFFFFF',
                  borderRadius: tokens['--radius'] || '0px',
                }}
              >
                DOORSTEP SALON
              </span>
            </div>

            {/* Card Mock */}
            <div
              className="p-4 space-y-3"
              style={{
                backgroundColor: tokens['--secondary'] || '#F4F4F5',
                border: `1px solid ${tokens['--border'] || '#E4E4E7'}`,
                borderRadius: tokens['--radius'] || '0px',
              }}
            >
              <span className="text-[9px] font-mono uppercase text-neutral-500 block">
                CURATED WORK
              </span>
              <h5
                className="text-base font-normal leading-tight"
                style={{ fontFamily: tokens['--font-serif'] || 'serif' }}
              >
                Heavyweight Boxy Hoodie (480 GSM)
              </h5>
              <p className="text-[10px] leading-relaxed opacity-80">
                Crafted from custom-milled French Terry loopback cotton.
              </p>
              <div className="flex justify-between items-center pt-2 font-mono text-xs">
                <strong className="font-bold tabular-nums">$165.00</strong>
                <span
                  className="text-[9px] font-bold uppercase"
                  style={{ color: tokens['--accent-green'] || '#166534' }}
                >
                  TRY-ON ELIGIBLE &bull; 45M
                </span>
              </div>
            </div>

            {/* Action Buttons Mock */}
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: tokens['--primary'] || '#0A0A0C',
                  color: tokens['--primary-foreground'] || '#FFFFFF',
                  borderRadius: tokens['--radius'] || '0px',
                }}
              >
                Primary Checkout
              </button>

              <button
                className="flex-1 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: tokens['--accent-gold'] || '#F59E0B',
                  color: '#000000',
                  borderRadius: tokens['--radius'] || '0px',
                }}
              >
                Bolt ⚡ Try-On
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

