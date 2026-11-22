'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Minus, Check, Layers, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@repo/ui'
import { formatINR } from '@repo/supabase/utils'

export interface SizeVariantItem {
  size: string
  sku: string
  stock: number
  price_override?: number | null
  enabled: boolean
}

export interface SizeMatrixInputProps {
  productTitle?: string
  basePrice?: number
  initialVariants?: SizeVariantItem[]
  onChange: (variants: Array<{ size: string; sku: string; stock: number; price_override?: number | null }>) => void
}

const PRESET_ALPHA = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const PRESET_WAIST = ['28', '30', '32', '34', '36']
const PRESET_ONE_SIZE = ['OS']

export function SizeMatrixInput({
  productTitle = 'GARMENT',
  basePrice = 100,
  initialVariants,
  onChange,
}: SizeMatrixInputProps) {
  const [selectedPreset, setSelectedPreset] = useState<'alpha' | 'waist' | 'one_size' | 'custom'>('alpha')

  const generateDefaultSku = (title: string, size: string) => {
    const slug = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .split('-')
      .filter(Boolean)
      .slice(0, 2)
      .join('-') || 'GAR'
    return `${slug}-${size}`
  }

  const [variants, setVariants] = useState<SizeVariantItem[]>(() => {
    if (initialVariants && initialVariants.length > 0) {
      return initialVariants
    }
    return PRESET_ALPHA.map((size) => ({
      size,
      sku: generateDefaultSku(productTitle, size),
      stock: size === 'M' || size === 'L' ? 30 : 15,
      price_override: null,
      enabled: true,
    }))
  })

  const [customSizeInput, setCustomSizeInput] = useState('')

  // Sync with parent form whenever variants change
  useEffect(() => {
    const enabledOnly = variants
      .filter((v) => v.enabled)
      .map((v) => ({
        size: v.size,
        sku: v.sku,
        stock: Math.max(0, Number(v.stock) || 0),
        price_override: v.price_override ?? null,
      }))
    onChange(enabledOnly)
  }, [variants])

  // Switch presets
  const handleApplyPreset = (presetType: 'alpha' | 'waist' | 'one_size') => {
    setSelectedPreset(presetType)
    const sizes =
      presetType === 'alpha' ? PRESET_ALPHA : presetType === 'waist' ? PRESET_WAIST : PRESET_ONE_SIZE

    setVariants(
      sizes.map((size) => ({
        size,
        sku: generateDefaultSku(productTitle, size),
        stock: size === 'M' || size === '32' || size === 'OS' ? 35 : 15,
        price_override: null,
        enabled: true,
      }))
    )
  }

  // Toggle active state of a size
  const handleToggleSize = (index: number) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, enabled: !v.enabled } : v))
    )
  }

  // Modify stock quantity manually or via stepper
  const handleStockChange = (index: number, newStock: number) => {
    const val = Math.max(0, Math.floor(newStock))
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, stock: val } : v))
    )
  }

  // Update custom SKU
  const handleSkuChange = (index: number, newSku: string) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, sku: newSku.toUpperCase() } : v))
    )
  }

  // Add custom size
  const handleAddCustomSize = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customSizeInput.trim()) return
    const sizeName = customSizeInput.trim().toUpperCase()
    if (variants.some((v) => v.size.toUpperCase() === sizeName)) {
      setCustomSizeInput('')
      return
    }
    setVariants((prev) => [
      ...prev,
      {
        size: sizeName,
        sku: generateDefaultSku(productTitle, sizeName),
        stock: 20,
        price_override: null,
        enabled: true,
      },
    ])
    setCustomSizeInput('')
    setSelectedPreset('custom')
  }

  // Totals calculations
  const totalUnits = variants
    .filter((v) => v.enabled)
    .reduce((sum, v) => sum + (Number(v.stock) || 0), 0)

  const totalInventoryValue = totalUnits * (Number(basePrice) || 0)

  return (
    <div className="space-y-6 bg-chrome-900 border border-chrome-800 p-5 sm:p-7 rounded-none">
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-chrome-850">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm uppercase tracking-wider font-semibold text-zinc-100">
              Apparel Size Matrix & Inventory Allocation
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Specify units manufactured per size. The storefront PDP adapts in real-time.
          </p>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-chrome-950 border border-chrome-800">
          <button
            type="button"
            onClick={() => handleApplyPreset('alpha')}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${selectedPreset === 'alpha'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-100'
              }`}
          >
            Streetwear (XS–XXL)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('waist')}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${selectedPreset === 'waist'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-100'
              }`}
          >
            Denim/Pants (28–36)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('one_size')}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${selectedPreset === 'one_size'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-100'
              }`}
          >
            One Size (OS)
          </button>
        </div>
      </div>

      {/* Real-Time Total Units Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-chrome-950 border border-chrome-800">
        <div>
          <span className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block">
            Total Batch Units
          </span>
          <span className="text-xl font-bold text-zinc-100 flex items-center gap-2 mt-0.5 font-mono">
            {totalUnits.toLocaleString()}
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-950/20 px-2 py-0.5 border border-emerald-800/40">
              {variants.filter((v) => v.enabled).length} Sizes Active
            </span>
          </span>
        </div>
        <div>
          <span className="text-3xs uppercase tracking-wider text-zinc-400 font-semibold block">
            Batch Retail Value
          </span>
          <span className="text-xl font-bold text-zinc-100 mt-0.5 block font-mono">
            {formatINR(totalInventoryValue)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-center sm:justify-end">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Auto-Syncs with PDP Island
          </span>
        </div>
      </div>

      {/* Sizing Matrix Grid */}
      <div className="space-y-3">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-3xs uppercase tracking-wider text-zinc-400 font-semibold">
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-4">Allocated Units</div>
          <div className="col-span-3">System SKU</div>
          <div className="col-span-2 text-right">Inventory Health</div>
        </div>

        <div className="space-y-2">
          {variants.map((v, idx) => (
            <div
              key={v.size}
              className={`grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 items-center border transition-all ${v.enabled
                ? 'bg-chrome-950 border-chrome-800 hover:border-chrome-750'
                : 'bg-chrome-950/40 border-chrome-850 opacity-40'
                }`}
            >
              {/* Toggle Active */}
              <div className="sm:col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={() => handleToggleSize(idx)}
                  className={`w-5 h-5 flex items-center justify-center border transition-colors ${v.enabled
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-transparent border-chrome-750 text-transparent'
                    }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              {/* Size Badge */}
              <div className="sm:col-span-2 flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-100 px-2.5 py-1 bg-chrome-900 border border-chrome-800 font-mono">
                  {v.size}
                </span>
                {!v.enabled && (
                  <span className="text-3xs uppercase text-zinc-500 font-mono">
                    Excluded
                  </span>
                )}
              </div>

              {/* Unit Allocation Controls */}
              <div className="sm:col-span-4 flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock - 5)}
                  className="w-8 h-8 flex items-center justify-center bg-chrome-900 hover:bg-chrome-850 disabled:opacity-30 border border-chrome-800 text-zinc-300 text-xs font-bold"
                  title="-5 units"
                >
                  -5
                </button>
                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock - 1)}
                  className="w-8 h-8 flex items-center justify-center bg-chrome-900 hover:bg-chrome-850 disabled:opacity-30 border border-chrome-800 text-zinc-300 text-xs"
                  title="-1 unit"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  disabled={!v.enabled}
                  value={v.stock}
                  onChange={(e) => handleStockChange(idx, parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center text-sm font-bold bg-chrome-900 border border-chrome-750 text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  min="0"
                />

                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-chrome-900 hover:bg-chrome-850 disabled:opacity-30 border border-chrome-800 text-zinc-300 text-xs"
                  title="+1 unit"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock + 10)}
                  className="w-8 h-8 flex items-center justify-center bg-chrome-900 hover:bg-chrome-850 disabled:opacity-30 border border-chrome-800 text-zinc-300 text-xs font-bold"
                  title="+10 units"
                >
                  +10
                </button>
              </div>

              {/* SKU */}
              <div className="sm:col-span-3">
                <input
                  type="text"
                  disabled={!v.enabled}
                  value={v.sku}
                  onChange={(e) => handleSkuChange(idx, e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-chrome-900 border border-chrome-800 text-zinc-200 uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Stock Health */}
              <div className="sm:col-span-2 text-left sm:text-right">
                {v.stock === 0 ? (
                  <span className="inline-block text-3xs uppercase font-bold text-rose-500 bg-rose-950/20 px-2 py-0.5 border border-rose-800/40">
                    Sold Out
                  </span>
                ) : v.stock <= 5 ? (
                  <span className="inline-block text-3xs uppercase font-bold text-amber-500 bg-amber-950/20 px-2 py-0.5 border border-amber-800/40">
                    Low ({v.stock})
                  </span>
                ) : (
                  <span className="inline-block text-3xs uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-950/20 px-2 py-0.5 border border-emerald-800/30">
                    Optimal ({v.stock})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Sizing Run */}
      <div className="pt-4 border-t border-chrome-850 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleAddCustomSize} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Add custom size (e.g. 3XL, Petite, 38)"
            value={customSizeInput}
            onChange={(e) => setCustomSizeInput(e.target.value)}
            className="h-8 px-3 text-xs bg-chrome-950 border border-chrome-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="h-8 px-3 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Size
          </button>
        </form>

        <span className="text-3xs text-zinc-500 font-mono">
          Size variants dynamically generate distinct PDP checkout triggers.
        </span>
      </div>
    </div>
  )
}
