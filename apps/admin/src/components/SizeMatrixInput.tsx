'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Minus, Check, Layers, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@repo/ui'

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
    <div className="space-y-6 bg-[#0E0E12] border border-[#23232A] p-5 sm:p-7 rounded-none">
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1F1F24]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#166534]" />
            <h3 className="text-sm uppercase tracking-wider font-semibold text-white">
              Apparel Size Matrix & Inventory Allocation
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Specify units manufactured per size. The storefront PDP adapts in real-time.
          </p>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#16161B] border border-[#23232A]">
          <button
            type="button"
            onClick={() => handleApplyPreset('alpha')}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              selectedPreset === 'alpha'
                ? 'bg-[#166534] text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Streetwear (XS–XXL)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('waist')}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              selectedPreset === 'waist'
                ? 'bg-[#166534] text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Denim/Pants (28–36)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('one_size')}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${
              selectedPreset === 'one_size'
                ? 'bg-[#166534] text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            One Size (OS)
          </button>
        </div>
      </div>

      {/* Real-Time Total Units Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#141418] border border-[#27272F]">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
            Total Batch Units
          </span>
          <span className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
            {totalUnits.toLocaleString()}
            <span className="text-xs font-normal text-[#166534] bg-[#166534]/15 px-2 py-0.5 border border-[#166534]/30">
              {variants.filter((v) => v.enabled).length} Sizes Active
            </span>
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
            Batch Retail Value
          </span>
          <span className="text-xl font-bold text-white mt-0.5 block">
            ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-center sm:justify-end">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#166534]" />
            Auto-Syncs with PDP Island
          </span>
        </div>
      </div>

      {/* Sizing Matrix Grid */}
      <div className="space-y-3">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
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
              className={`grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 items-center border transition-all ${
                v.enabled
                  ? 'bg-[#121216] border-[#2A2A32] hover:border-neutral-600'
                  : 'bg-[#0B0B0E] border-[#1C1C22] opacity-40'
              }`}
            >
              {/* Toggle Active */}
              <div className="sm:col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={() => handleToggleSize(idx)}
                  className={`w-5 h-5 flex items-center justify-center border transition-colors ${
                    v.enabled
                      ? 'bg-[#166534] border-[#166534] text-white'
                      : 'bg-transparent border-neutral-700 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              {/* Size Badge */}
              <div className="sm:col-span-2 flex items-center gap-2">
                <span className="text-sm font-bold text-white px-2.5 py-1 bg-[#1A1A22] border border-[#30303C]">
                  {v.size}
                </span>
                {!v.enabled && (
                  <span className="text-[10px] uppercase text-neutral-500 font-mono">
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
                  className="w-8 h-8 flex items-center justify-center bg-[#1A1A22] hover:bg-neutral-800 disabled:opacity-30 border border-[#2E2E3A] text-neutral-300 text-xs font-bold"
                  title="-5 units"
                >
                  -5
                </button>
                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock - 1)}
                  className="w-8 h-8 flex items-center justify-center bg-[#1A1A22] hover:bg-neutral-800 disabled:opacity-30 border border-[#2E2E3A] text-neutral-300 text-xs"
                  title="-1 unit"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  disabled={!v.enabled}
                  value={v.stock}
                  onChange={(e) => handleStockChange(idx, parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-center text-sm font-bold bg-[#181820] border border-[#3A3A48] text-white focus:outline-none focus:border-[#166534]"
                  min="0"
                />

                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-[#1A1A22] hover:bg-neutral-800 disabled:opacity-30 border border-[#2E2E3A] text-neutral-300 text-xs"
                  title="+1 unit"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!v.enabled}
                  onClick={() => handleStockChange(idx, v.stock + 10)}
                  className="w-8 h-8 flex items-center justify-center bg-[#1A1A22] hover:bg-neutral-800 disabled:opacity-30 border border-[#2E2E3A] text-neutral-300 text-xs font-bold"
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
                  className="w-full h-8 px-2.5 text-xs font-mono bg-[#16161D] border border-[#2A2A35] text-neutral-300 uppercase focus:outline-none focus:border-neutral-500"
                />
              </div>

              {/* Stock Health */}
              <div className="sm:col-span-2 text-left sm:text-right">
                {v.stock === 0 ? (
                  <span className="inline-block text-[10px] uppercase font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 border border-rose-800/40">
                    Sold Out
                  </span>
                ) : v.stock <= 5 ? (
                  <span className="inline-block text-[10px] uppercase font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 border border-amber-800/40">
                    Low ({v.stock})
                  </span>
                ) : (
                  <span className="inline-block text-[10px] uppercase font-bold text-[#166534] bg-[#166534]/15 px-2 py-0.5 border border-[#166534]/30">
                    Optimal ({v.stock})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Sizing Run */}
      <div className="pt-4 border-t border-[#1F1F24] flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleAddCustomSize} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Add custom size (e.g. 3XL, Petite, 38)"
            value={customSizeInput}
            onChange={(e) => setCustomSizeInput(e.target.value)}
            className="h-8 px-3 text-xs bg-[#16161B] border border-[#2A2A35] text-white placeholder-neutral-500 focus:outline-none focus:border-[#166534]"
          />
          <button
            type="submit"
            className="h-8 px-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Size
          </button>
        </form>

        <span className="text-[11px] text-neutral-500 font-mono">
          Size variants dynamically generate distinct PDP checkout triggers.
        </span>
      </div>
    </div>
  )
}
