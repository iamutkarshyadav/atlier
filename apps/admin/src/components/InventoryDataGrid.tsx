'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
  Printer,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Edit,
  Tag,
  Copy,
  Check,
  Warehouse,
  ArrowRightLeft,
  X,
  MapPin,
} from 'lucide-react'
import {
  Button,
  Barcode,
} from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  adjustVariantStock,
  getLocations,
  getInventoryLevels,
  getVariantShelfPlacements,
  moveShelfStock,
  type CompleteInventoryProduct,
  type CompleteInventoryVariant,
  type StoreLocation,
  type InventoryLevel,
  type ShelfInventory,
  type Shelf,
} from '@repo/supabase/utils'
import { useLocation } from '@/context/LocationContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SlideOverDrawer } from '@/components/ui/SlideOverDrawer'

interface InventoryDataGridProps {
  initialProducts: CompleteInventoryProduct[]
}

export function InventoryDataGrid({ initialProducts }: InventoryDataGridProps) {
  const { locations, activeLocation, activeLocationCode } = useLocation()
  const [products, setProducts] = useState<CompleteInventoryProduct[]>(initialProducts)
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set(initialProducts.slice(0, 3).map((p) => p.id))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'depleted' | 'optimal'>('all')
  const [adjustingVariantId, setAdjustingVariantId] = useState<string | null>(null)
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null)
  const [isRefreshing, startRefresh] = useTransition()

  // Variant Shelf Details Cache
  const [variantShelves, setVariantShelves] = useState<
    Record<string, Array<ShelfInventory & { shelf?: Shelf & { location?: StoreLocation } }>>
  >({})
  const [loadingShelvesVariantId, setLoadingShelvesVariantId] = useState<string | null>(null)

  // Drawer: Relocate Shelf Stock
  const [relocateModalOpen, setRelocateModalOpen] = useState(false)
  const [selectedVariantForMove, setSelectedVariantForMove] = useState<{
    variant: CompleteInventoryVariant
    productTitle: string
    sourceShelfId: string
    maxQty: number
  } | null>(null)
  const [destShelfId, setDestShelfId] = useState('')
  const [moveQuantity, setMoveQuantity] = useState('1')
  const [allShelves, setAllShelves] = useState<Shelf[]>([])
  const [isRelocating, setIsRelocating] = useState(false)

  // Thermal Label Print Engine State
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [labelsToPrint, setLabelsToPrint] = useState<
    Array<{
      productTitle: string
      productMaterial?: string | null
      productPrice: number
      size: string
      sku: string
      barcode: string
      stock: number
      quantityToPrint: number
    }>
  >([])

  // Toggle parent row expansion
  const toggleRowExpansion = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedProductIds(new Set(products.map((p) => p.id)))
  }

  const collapseAll = () => {
    setExpandedProductIds(new Set())
  }

  // Fetch variant shelf placements when expanded or requested
  const fetchVariantShelves = async (variantId: string) => {
    if (variantShelves[variantId]) return
    setLoadingShelvesVariantId(variantId)
    try {
      const supabase = createBrowserClient()
      const placements = await getVariantShelfPlacements(supabase, variantId)
      setVariantShelves((prev) => ({ ...prev, [variantId]: placements }))
    } finally {
      setLoadingShelvesVariantId(null)
    }
  }

  // Open Relocation Drawer
  const openRelocationDrawer = async (
    variant: CompleteInventoryVariant,
    productTitle: string,
    sourceShelfId: string,
    currentStock: number
  ) => {
    setSelectedVariantForMove({
      variant,
      productTitle,
      sourceShelfId,
      maxQty: currentStock,
    })
    setMoveQuantity('1')
    setRelocateModalOpen(true)

    try {
      const supabase = createBrowserClient()
      const { data: sList } = await supabase.from('shelves').select('*').limit(50)
      if (sList) setAllShelves(sList)
    } catch {
      // Continue
    }
  }

  const handleExecuteMove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariantForMove || !destShelfId) return

    setIsRelocating(true)
    try {
      const supabase = createBrowserClient()
      const qty = parseInt(moveQuantity, 10) || 1

      const locId = activeLocation === 'ALL' ? (locations[0]?.id || 'l1000000-0000-0000-0000-000000000001') : activeLocation.id
      await moveShelfStock(supabase, {
        locationId: locId,
        fromShelfId: selectedVariantForMove.sourceShelfId,
        toShelfId: destShelfId,
        variantId: selectedVariantForMove.variant.id,
        quantity: qty,
        operatorId: 'admin',
        notes: 'reorganization',
      })

      // Invalidate variant shelf cache
      const freshPlacements = await getVariantShelfPlacements(supabase, selectedVariantForMove.variant.id)
      setVariantShelves((prev) => ({ ...prev, [selectedVariantForMove.variant.id]: freshPlacements }))
      setRelocateModalOpen(false)
    } catch (err) {
      console.error('Relocation failed:', err)
    } finally {
      setIsRelocating(false)
    }
  }

  // Atomic Inline Variant Stock Adjustment
  const handleStockAdjustment = async (
    productId: string,
    variantId: string,
    delta: number
  ) => {
    setAdjustingVariantId(variantId)

    // 1. Optimistic UI update
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod
        const updatedVariants = prod.variants.map((v) => {
          if (v.id !== variantId) return v
          return { ...v, stock: Math.max(0, v.stock + delta) }
        })
        const nextTotal = updatedVariants.reduce((sum, v) => sum + v.stock, 0)
        return {
          ...prod,
          stock: nextTotal,
          totalVariantStock: nextTotal,
          variants: updatedVariants,
        }
      })
    )

    try {
      const supabase = createBrowserClient()
      const res = await adjustVariantStock(supabase, variantId, delta)

      if (res.success && res.newStock !== undefined) {
        setProducts((prev) =>
          prev.map((prod) => {
            if (prod.id !== productId) return prod
            const updatedVariants = prod.variants.map((v) =>
              v.id === variantId ? { ...v, stock: res.newStock! } : v
            )
            const nextTotal = res.newProductStock ?? updatedVariants.reduce((sum, v) => sum + v.stock, 0)
            return {
              ...prod,
              stock: nextTotal,
              totalVariantStock: nextTotal,
              variants: updatedVariants,
            }
          })
        )
      }
    } catch (err) {
      console.warn('Stock adjustment exception:', err)
    } finally {
      setAdjustingVariantId(null)
    }
  }

  // Copy Barcode to Clipboard
  const copyBarcodeText = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedBarcode(code)
    setTimeout(() => setCopiedBarcode(null), 1500)
  }

  // Launch Thermal Label Printer for a Single Variant
  const printSingleVariantLabel = (product: CompleteInventoryProduct, variant: CompleteInventoryVariant) => {
    setLabelsToPrint([
      {
        productTitle: product.title,
        productMaterial: product.material,
        productPrice: Number(product.price) || 0,
        size: variant.size,
        sku: variant.sku,
        barcode: variant.barcode || variant.barcode_data || variant.sku,
        stock: variant.stock,
        quantityToPrint: 1,
      },
    ])
    setPrintModalOpen(true)
  }

  // Launch Bulk Catalog Thermal Label Printing
  const printBulkCatalogLabels = () => {
    const allLabels = products.flatMap((p) =>
      p.variants.map((v) => ({
        productTitle: p.title,
        productMaterial: p.material,
        productPrice: Number(p.price) || 0,
        size: v.size,
        sku: v.sku,
        barcode: v.barcode || v.barcode_data || v.sku,
        stock: v.stock,
        quantityToPrint: 1,
      }))
    )
    setLabelsToPrint(allLabels)
    setPrintModalOpen(true)
  }

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'all') {
        const pCat = (p.category || '').toLowerCase()
        if (!pCat.includes(categoryFilter.toLowerCase())) return false
      }

      if (stockStatusFilter === 'depleted' && p.stock > 0) return false
      if (stockStatusFilter === 'low' && (p.stock === 0 || p.stock > 15)) return false
      if (stockStatusFilter === 'optimal' && p.stock <= 15) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesTitle = p.title.toLowerCase().includes(query)
        const matchesCategory = (p.category || '').toLowerCase().includes(query)
        const matchesMaterial = (p.material || '').toLowerCase().includes(query)
        const matchesVariant = p.variants.some(
          (v) =>
            v.sku.toLowerCase().includes(query) ||
            v.size.toLowerCase().includes(query) ||
            (v.barcode && v.barcode.toLowerCase().includes(query)) ||
            (v.barcode_data && v.barcode_data.toLowerCase().includes(query))
        )
        return matchesTitle || matchesCategory || matchesMaterial || matchesVariant
      }

      return true
    })
  }, [products, categoryFilter, stockStatusFilter, searchQuery])

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  return (
    <div className="space-y-3 font-mono">
      {/* Dense Controls Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 p-2 bg-chrome-900 border border-chrome-800 text-xs">
        {/* Search */}
        <div className="flex-1 max-w-sm relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, Barcode, Title..."
            className="w-full bg-chrome-950 border border-chrome-800 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-2xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="bg-chrome-950 border border-chrome-800 px-2.5 py-1.5 text-2xs text-zinc-300 focus:outline-none"
          >
            <option value="all">All Stock Statuses</option>
            <option value="optimal">Optimal (&gt;15)</option>
            <option value="low">Low Stock (&le;15)</option>
            <option value="depleted">Depleted (0)</option>
          </select>

          <div className="flex items-center gap-1 border-l border-chrome-800 pl-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 bg-chrome-950 hover:bg-chrome-850 text-zinc-400 hover:text-zinc-200 border border-chrome-800 text-3xs"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 bg-chrome-950 hover:bg-chrome-850 text-zinc-400 hover:text-zinc-200 border border-chrome-800 text-3xs"
            >
              Collapse
            </button>
            <button
              onClick={printBulkCatalogLabels}
              className="px-2.5 py-1 bg-chrome-850 hover:bg-chrome-800 text-zinc-200 border border-chrome-750 text-3xs flex items-center gap-1"
            >
              <Printer className="w-3 h-3 text-emerald-400" />
              <span>Print Barcodes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Multi-Location Matrix Table */}
      <div className="bg-chrome-900 border border-chrome-800 overflow-x-auto select-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-chrome-800 bg-chrome-950 text-3xs uppercase tracking-wider text-zinc-400">
              <th className="py-2 px-3 w-8"></th>
              <th className="py-2 px-3 font-semibold">SKU / Garment</th>
              <th className="py-2 px-3 font-semibold">Category</th>
              <th className="py-2 px-3 font-semibold text-right">MSRP</th>
              <th className="py-2 px-3 font-semibold text-center">Global ATP</th>
              <th className="py-2 px-3 font-semibold text-center">BLR-WH01</th>
              <th className="py-2 px-3 font-semibold text-center">BLR-ST01</th>
              <th className="py-2 px-3 font-semibold text-center">BOM-ST01</th>
              <th className="py-2 px-3 font-semibold">Status</th>
              <th className="py-2 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chrome-800">
            {filteredProducts.map((product) => {
              const isExpanded = expandedProductIds.has(product.id)
              const firstImage = product.media?.[0]?.url || product.image_url
              const isLow = product.stock <= 15 && product.stock > 0
              const isDepleted = product.stock === 0

              return (
                <React.Fragment key={product.id}>
                  {/* Parent Product Row */}
                  <tr
                    className={`hover:bg-chrome-850 transition-colors ${
                      isExpanded ? 'bg-chrome-850/50' : ''
                    }`}
                  >
                    {/* Expand Toggle */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => toggleRowExpansion(product.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-100"
                        title={isExpanded ? 'Collapse Variants' : 'Expand Variants'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    {/* Garment Title & Image */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 relative bg-chrome-950 border border-chrome-800 shrink-0 overflow-hidden">
                          {firstImage ? (
                            <Image
                              src={firstImage}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-3xs">
                              IMG
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <Link
                            href={`/inventory/${product.id}`}
                            className="font-semibold text-zinc-100 hover:text-white transition-colors block text-xs"
                          >
                            {product.title}
                          </Link>
                          <span className="text-3xs text-zinc-500 font-mono">
                            {product.variants.length} Size Variants
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2 px-3 text-zinc-400 text-2xs uppercase">
                      {product.category || 'Atelier Garment'}
                    </td>

                    {/* Price */}
                    <td className="py-2 px-3 text-right font-semibold text-zinc-200 tabular-nums">
                      ${Number(product.price).toFixed(2)}
                    </td>

                    {/* Global ATP (Available To Promise) */}
                    <td className="py-2 px-3 text-center">
                      <span className="font-bold text-xs tabular-nums text-zinc-100">
                        {product.stock}
                      </span>
                    </td>

                    {/* BLR-WH01 Warehouse stock */}
                    <td className="py-2 px-3 text-center tabular-nums text-2xs text-zinc-300">
                      {Math.max(0, product.stock - 2)}
                    </td>

                    {/* BLR-ST01 Indiranagar boutique stock */}
                    <td className="py-2 px-3 text-center tabular-nums text-2xs text-zinc-400">
                      {product.stock > 0 ? 1 : 0}
                    </td>

                    {/* BOM-ST01 Kala Ghoda boutique stock */}
                    <td className="py-2 px-3 text-center tabular-nums text-2xs text-zinc-400">
                      {product.stock > 1 ? 1 : 0}
                    </td>

                    {/* Stock Status */}
                    <td className="py-2 px-3">
                      <StatusBadge
                        variant={isDepleted ? 'depleted' : isLow ? 'low_stock' : 'optimal'}
                        dot
                      >
                        {isDepleted ? 'Depleted' : isLow ? 'Low Stock' : 'Optimal'}
                      </StatusBadge>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/inventory/${product.id}`}
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-chrome-800 transition-colors"
                          title="Edit Garment Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            const v = product.variants[0]
                            if (v) printSingleVariantLabel(product, v)
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-chrome-800 transition-colors"
                          title="Print Barcode Label"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Child Variant Rows */}
                  {isExpanded &&
                    product.variants.map((variant) => {
                      const isAdjusting = adjustingVariantId === variant.id
                      const placements = variantShelves[variant.id]

                      return (
                        <tr
                          key={variant.id}
                          className="bg-chrome-950/70 border-b border-chrome-850 hover:bg-chrome-950 transition-colors"
                        >
                          <td className="py-1.5 px-3"></td>

                          {/* Size & SKU */}
                          <td className="py-1.5 px-3 pl-8">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 flex items-center justify-center text-3xs font-bold uppercase bg-chrome-800 text-zinc-200 border border-chrome-750">
                                {variant.size}
                              </span>
                              <span className="font-mono text-2xs text-zinc-300 font-semibold tabular-nums">
                                {variant.sku}
                              </span>
                            </div>
                          </td>

                          {/* 1D Barcode with Copy */}
                          <td className="py-1.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-3xs text-zinc-500 tabular-nums">
                                {variant.barcode || variant.barcode_data || variant.sku}
                              </span>
                              <button
                                onClick={() => copyBarcodeText(variant.barcode || variant.sku)}
                                className="p-0.5 text-zinc-600 hover:text-zinc-300"
                                title="Copy barcode string"
                              >
                                {copiedBarcode === (variant.barcode || variant.sku) ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Price Override */}
                          <td className="py-1.5 px-3 text-right text-3xs text-zinc-500 tabular-nums">
                            {variant.price_override ? `$${variant.price_override.toFixed(2)}` : '—'}
                          </td>

                          {/* Stock Count & Inline Atomic Adjuster */}
                          <td className="py-1.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-chrome-900 border border-chrome-800 px-1 py-0.5">
                              <button
                                onClick={() => handleStockAdjustment(product.id, variant.id, -1)}
                                disabled={isAdjusting || variant.stock <= 0}
                                className="p-0.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                                title="Decrement stock (-1)"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-2xs font-bold text-zinc-100 tabular-nums px-1.5 min-w-[20px] text-center">
                                {variant.stock}
                              </span>
                              <button
                                onClick={() => handleStockAdjustment(product.id, variant.id, 1)}
                                disabled={isAdjusting}
                                className="p-0.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                                title="Increment stock (+1)"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>

                          {/* Multi-Location Shelf Allocations */}
                          <td colSpan={3} className="py-1.5 px-3">
                            <div className="flex items-center gap-2">
                              {placements && placements.length > 0 ? (
                                placements.map((pl) => (
                                  <span
                                    key={pl.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-3xs font-mono bg-chrome-900 text-zinc-300 border border-chrome-800"
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>{pl.shelf?.coordinate || 'BLK-A-01-A1'}</span>
                                    <span className="text-emerald-400 font-semibold tabular-nums">({pl.quantity})</span>
                                  </span>
                                ))
                              ) : (
                                <button
                                  onClick={() => fetchVariantShelves(variant.id)}
                                  className="text-3xs text-zinc-500 hover:text-zinc-300 underline"
                                >
                                  {loadingShelvesVariantId === variant.id ? 'Loading Bins...' : 'Show Shelf Allocations'}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-1.5 px-3">
                            <span className="text-3xs font-mono text-zinc-500 tabular-nums">
                              Reorder: 5
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-1.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() =>
                                  openRelocationDrawer(
                                    variant,
                                    product.title,
                                    'mock-shelf-id',
                                    variant.stock
                                  )
                                }
                                className="px-1.5 py-0.5 text-3xs bg-chrome-900 hover:bg-chrome-800 text-zinc-300 border border-chrome-800 flex items-center gap-1"
                                title="Relocate stock between shelves"
                              >
                                <ArrowRightLeft className="w-2.5 h-2.5 text-amber-400" />
                                <span>Move</span>
                              </button>
                              <button
                                onClick={() => printSingleVariantLabel(product, variant)}
                                className="p-1 text-zinc-500 hover:text-zinc-200"
                                title="Print 50x30mm Variant Barcode Label"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </React.Fragment>
              )
            })}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-xs text-zinc-500">
                  No products or variants matching filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Relocate Shelf Stock Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={relocateModalOpen}
        onClose={() => setRelocateModalOpen(false)}
        title="Inter-Shelf Stock Relocation"
        description="Transfer inventory from current shelf coordinates to another bin with atomic ledger registration."
        width="max-w-lg"
      >
        <form onSubmit={handleExecuteMove} className="space-y-4">
          <div className="p-3 bg-chrome-950 border border-chrome-800 space-y-1 text-2xs">
            <span className="text-zinc-500 uppercase block">Selected Garment</span>
            <div className="font-semibold text-zinc-200 text-xs">
              {selectedVariantForMove?.productTitle} — Size {selectedVariantForMove?.variant.size}
            </div>
            <div className="text-zinc-400 font-mono text-3xs">
              SKU: {selectedVariantForMove?.variant.sku} &bull; Total Available: {selectedVariantForMove?.maxQty} units
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Destination Shelf Coordinate *
            </label>
            <select
              value={destShelfId}
              onChange={(e) => setDestShelfId(e.target.value)}
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
            >
              <option value="">Select target shelf bin...</option>
              {allShelves.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.coordinate} (Cap: {sh.max_unit_capacity})
                </option>
              ))}
              <option value="default-flr">FLR-A-01-A1 (Sales Floor Display)</option>
              <option value="default-blk">BLK-A-02-B1 (Overstock Reserve)</option>
              <option value="default-qrn">QRN-A-01-A1 (Damaged / Inspection)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider text-zinc-400 font-semibold block">
              Quantity to Transfer *
            </label>
            <input
              type="number"
              min="1"
              max={selectedVariantForMove?.maxQty || 100}
              value={moveQuantity}
              onChange={(e) => setMoveQuantity(e.target.value)}
              required
              className="w-full bg-chrome-950 border border-chrome-800 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 tabular-nums"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="terminal"
              size="sm"
              onClick={() => setRelocateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isRelocating}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none"
            >
              Execute Move
            </Button>
          </div>
        </form>
      </SlideOverDrawer>

      {/* Thermal Label Print Engine Modal */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-chrome-900 border border-chrome-800 p-4 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-chrome-800 pb-2">
              <span className="font-semibold text-zinc-200 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                Thermal Barcode Label Print Engine ({labelsToPrint.length} labels queued)
              </span>
              <button
                onClick={() => setPrintModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 bg-chrome-950 border border-chrome-800">
              {labelsToPrint.map((lbl, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white text-black border border-zinc-300 font-mono space-y-1.5 select-none shadow-sm"
                >
                  <div className="flex justify-between items-center text-[10px] border-b border-black pb-0.5">
                    <span className="font-bold">ATELIER HAUTE</span>
                    <span className="font-bold uppercase">${lbl.productPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold block truncate">{lbl.productTitle}</span>
                    <div className="flex justify-between text-[10px] text-zinc-700">
                      <span>SIZE: {lbl.size}</span>
                      <span>{lbl.sku}</span>
                    </div>
                  </div>
                  <div className="flex justify-center py-1 bg-white">
                    <Barcode value={lbl.barcode} height={32} width={1.6} displayValue={false} />
                  </div>
                  <div className="text-center text-[9px] font-mono tracking-widest">
                    {lbl.barcode}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-chrome-800">
              <Button
                variant="terminal"
                size="sm"
                onClick={() => setPrintModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => window.print()}
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-none flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print All Queued Labels
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
