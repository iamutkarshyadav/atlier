'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
  Printer,
  Barcode as BarcodeIcon,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Edit,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  Sparkles,
  ArrowUpDown,
  X,
} from 'lucide-react'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Barcode,
} from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  adjustVariantStock,
  type CompleteInventoryProduct,
  type CompleteInventoryVariant,
} from '@repo/supabase/utils'

interface InventoryDataGridProps {
  initialProducts: CompleteInventoryProduct[]
}

export function InventoryDataGrid({ initialProducts }: InventoryDataGridProps) {
  const [products, setProducts] = useState<CompleteInventoryProduct[]>(initialProducts)
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    new Set(initialProducts.slice(0, 2).map((p) => p.id))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'depleted' | 'optimal'>('all')
  const [adjustingVariantId, setAdjustingVariantId] = useState<string | null>(null)
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null)
  const [isRefreshing, startRefresh] = useTransition()

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
        // Sync with confirmed database result
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

  // Launch Thermal Label Printer for all variants of a product
  const printProductVariantsLabels = (product: CompleteInventoryProduct) => {
    setLabelsToPrint(
      product.variants.map((v) => ({
        productTitle: product.title,
        productMaterial: product.material,
        productPrice: Number(product.price) || 0,
        size: v.size,
        sku: v.sku,
        barcode: v.barcode || v.barcode_data || v.sku,
        stock: v.stock,
        quantityToPrint: 1,
      }))
    )
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

  // Trigger browser print
  const executePrint = () => {
    window.print()
  }

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'all') {
        const pCat = (p.category || '').toLowerCase()
        if (!pCat.includes(categoryFilter.toLowerCase())) return false
      }

      // Stock status filter
      if (stockStatusFilter === 'depleted' && p.stock > 0) return false
      if (stockStatusFilter === 'low' && (p.stock === 0 || p.stock > 15)) return false
      if (stockStatusFilter === 'optimal' && p.stock <= 15) return false

      // Search query across parent and child variants
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

  // Catalog KPIs
  const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0)
  const totalSKUs = products.reduce((sum, p) => sum + p.variants.length, 0)
  const totalValuation = products.reduce((sum, p) => sum + (p.stock || 0) * (Number(p.price) || 0), 0)
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 15).length
  const depletedCount = products.filter((p) => p.stock === 0).length

  return (
    <div className="space-y-6 font-mono">
      {/* KPI Command Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#0D0D10] border border-[#23232A]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Total Units In Warehouse</span>
          <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-2">
            {totalUnits.toLocaleString()}
            <span className="text-[10px] font-normal text-emerald-400">Live Sync</span>
          </div>
        </div>

        <div className="p-3.5 bg-[#0D0D10] border border-[#23232A]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Active Size SKUs</span>
          <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-2">
            {totalSKUs}
            <span className="text-[10px] font-normal text-neutral-400">Matrix</span>
          </div>
        </div>

        <div className="p-3.5 bg-[#0D0D10] border border-[#23232A]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Inventory Valuation</span>
          <div className="text-xl font-bold text-white mt-1">
            ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 bg-[#0D0D10] border border-[#23232A]">
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Low Stock Alerts</span>
          <div className="text-xl font-bold text-amber-300 mt-1 flex items-center gap-1.5">
            {lowStockCount}
            {lowStockCount > 0 && <span className="text-[10px] font-normal text-amber-400">Needs Drop</span>}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3.5 bg-[#0D0D10] border border-[#23232A] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Thermal Engine</span>
            <span className="text-xs font-semibold text-white mt-0.5 block">Zebra / Dymo 2x1</span>
          </div>
          <Button
            size="sm"
            onClick={printBulkCatalogLabels}
            className="bg-amber-950/40 border border-amber-800 text-amber-300 hover:bg-amber-900/40 text-xs px-2.5 py-1 flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" /> Bulk Print
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-[#0A0A0D] border border-[#23232A]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by garment title, SKU (e.g. HD-BOX), size, or barcode..."
            className="w-full bg-[#141418] border border-[#27272F] text-xs text-white pl-9 pr-8 py-2 focus:border-amber-400 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Pills */}
          <div className="flex items-center gap-1 bg-[#141418] p-1 border border-[#27272F] text-xs">
            {['all', 'hoodies', 'tees', 'outerwear', 'pants'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-[11px] uppercase transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#23232A] text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Stock Health Dropdown */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="bg-[#141418] border border-[#27272F] text-xs text-neutral-300 px-3 py-2 focus:border-amber-400 focus:outline-none"
          >
            <option value="all">All Stock Levels</option>
            <option value="optimal">Optimal Stock (&gt; 15)</option>
            <option value="low">Low Stock (&le; 15)</option>
            <option value="depleted">Depleted (0)</option>
          </select>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1 border-l border-[#27272F] pl-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="bg-[#141418] border-[#27272F] text-[11px] text-neutral-400 hover:text-white px-2 py-1"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="bg-[#141418] border-[#27272F] text-[11px] text-neutral-400 hover:text-white px-2 py-1"
            >
              Collapse
            </Button>
          </div>
        </div>
      </div>

      {/* Hierarchical Inventory Data Table */}
      <div className="border border-[#23232A] bg-[#0A0A0D] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-[#121216] border-b border-[#23232A]">
            <TableRow>
              <TableHead className="w-10 text-center"></TableHead>
              <TableHead className="w-16">Asset</TableHead>
              <TableHead className="text-white text-xs">Garment Dossier & Provenance</TableHead>
              <TableHead className="text-white text-xs">Taxonomy</TableHead>
              <TableHead className="text-white text-xs">Retail Price</TableHead>
              <TableHead className="text-white text-xs">Variant Breakdown</TableHead>
              <TableHead className="text-white text-xs text-right">Aggregate Stock</TableHead>
              <TableHead className="text-white text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-neutral-500 text-xs">
                  No garments match the current query filter. Try refining the search parameters.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isExpanded = expandedProductIds.has(product.id)
                const stock = product.stock || 0
                const isLow = stock > 0 && stock <= 15
                const isDepleted = stock === 0

                return (
                  <React.Fragment key={product.id}>
                    {/* PARENT ROW */}
                    <TableRow
                      onClick={() => toggleRowExpansion(product.id)}
                      className={`cursor-pointer transition-colors border-b border-[#1E1E24] hover:bg-[#121218] ${
                        isExpanded ? 'bg-[#0E0E12]' : 'bg-transparent'
                      }`}
                    >
                      {/* Accordion Chevron */}
                      <TableCell className="text-center py-4">
                        <button
                          type="button"
                          className="text-neutral-500 hover:text-amber-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRowExpansion(product.id)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-amber-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Product Thumbnail */}
                      <TableCell className="py-3">
                        <div className="relative w-12 h-14 bg-[#141418] border border-[#27272F] overflow-hidden shrink-0">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-600">
                              NO IMG
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Title & Metadata */}
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-white hover:text-amber-300 transition-colors">
                              {product.title}
                            </span>
                            {product.edition && (
                              <span className="text-[10px] px-1.5 py-0.2 border border-neutral-700 bg-neutral-900 text-neutral-400">
                                {product.edition}
                              </span>
                            )}
                          </div>
                          {product.material && (
                            <p className="text-[11px] text-neutral-400 font-sans line-clamp-1">
                              {product.material}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-3">
                        <Badge
                          variant="terminal"
                          className="text-[10px] uppercase font-mono tracking-wider bg-[#16161C] border-[#2A2A35] text-neutral-300"
                        >
                          {product.category || 'Atelier'}
                        </Badge>
                      </TableCell>

                      {/* Retail Price */}
                      <TableCell className="py-3 font-mono text-xs text-white">
                        ${Number(product.price).toFixed(2)}
                      </TableCell>

                      {/* Variant Matrix Chips */}
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {product.variants.map((v) => (
                            <span
                              key={v.id}
                              className={`text-[10px] px-1.5 py-0.5 border font-mono ${
                                v.stock === 0
                                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-400 line-through'
                                  : v.stock <= 5
                                  ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                                  : 'bg-[#181820] border-[#2D2D38] text-neutral-300'
                              }`}
                            >
                              {v.size}: <span className="font-semibold">{v.stock}</span>
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      {/* Aggregate Stock */}
                      <TableCell className="py-3 text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-sm font-bold text-white font-mono">
                            {stock} <span className="text-[10px] font-normal text-neutral-500">units</span>
                          </span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 mt-0.5 border ${
                              isDepleted
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                                : isLow
                                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            }`}
                          >
                            {isDepleted ? 'Depleted' : isLow ? 'Low Reserve' : 'Allocated'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printProductVariantsLabels(product)}
                            title="Print thermal labels for all sizes of this garment"
                            className="bg-[#141418] border-[#27272F] text-amber-300 hover:bg-amber-950/20 text-xs px-2.5 py-1 flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> Labels
                          </Button>

                          <Link href={`/inventory/${product.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-[#141418] border-[#27272F] text-neutral-300 hover:text-white text-xs px-2.5 py-1 flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* EXPANDABLE INLINE VARIANT MATRIX (ACCORDION SUB-TABLE) */}
                    {isExpanded && (
                      <TableRow className="bg-[#070709] border-b border-[#23232A]">
                        <TableCell colSpan={8} className="p-0">
                          <div className="p-5 pl-12 bg-gradient-to-b from-[#09090D] to-[#060608] border-l-2 border-amber-400 space-y-4">
                            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-2">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                                  Physical Size Matrix & Barcode Registry
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  ({product.variants.length} SKU variants allocated)
                                </span>
                              </div>

                              <span className="text-[10px] text-neutral-500">
                                Atomic RPC: adjust_variant_stock() active
                              </span>
                            </div>

                            {/* Sub-table of Variants */}
                            <div className="border border-[#1E1E26] bg-[#0A0A0D]">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-[#1E1E26] bg-[#101015] text-[10px] uppercase text-neutral-400 font-semibold">
                                    <th className="p-2.5 pl-4">Size</th>
                                    <th className="p-2.5">Warehouse SKU</th>
                                    <th className="p-2.5">Real-Time Stock</th>
                                    <th className="p-2.5">Health</th>
                                    <th className="p-2.5 text-center">Symbology (Code 128)</th>
                                    <th className="p-2.5 text-right pr-4">Physical Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {product.variants.map((v) => {
                                    const vStock = v.stock
                                    const vBarcode = v.barcode || v.barcode_data || v.sku
                                    const isAdjusting = adjustingVariantId === v.id

                                    return (
                                      <tr
                                        key={v.id}
                                        className="border-b border-[#181820] last:border-none hover:bg-[#101017] transition-colors"
                                      >
                                        {/* Size Pill */}
                                        <td className="p-2.5 pl-4 font-bold text-white">
                                          <span className="inline-block px-2 py-0.5 bg-[#181822] border border-neutral-700 text-amber-300 font-mono text-xs text-center min-w-[34px]">
                                            {v.size}
                                          </span>
                                        </td>

                                        {/* SKU with Copy Action */}
                                        <td className="p-2.5 font-mono text-neutral-300">
                                          <div className="flex items-center gap-1.5 group">
                                            <span className="font-semibold">{v.sku}</span>
                                            <button
                                              onClick={() => copyBarcodeText(v.sku)}
                                              title="Copy SKU"
                                              className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-white"
                                            >
                                              {copiedBarcode === v.sku ? (
                                                <Check className="w-3 h-3 text-emerald-400" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </button>
                                          </div>
                                        </td>

                                        {/* Inline Stock Adjustment Controls (+ / -) */}
                                        <td className="p-2.5">
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleStockAdjustment(product.id, v.id, -1)}
                                              disabled={isAdjusting || vStock <= 0}
                                              title="Decrement 1 unit"
                                              className="w-6 h-6 flex items-center justify-center bg-[#181820] hover:bg-[#252532] text-neutral-300 hover:text-white border border-[#2D2D3A] disabled:opacity-30 disabled:hover:bg-[#181820] transition-colors"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>

                                            <span className="w-10 text-center font-bold text-white font-mono text-xs">
                                              {isAdjusting ? (
                                                <RefreshCw className="w-3 h-3 animate-spin mx-auto text-amber-400" />
                                              ) : (
                                                vStock
                                              )}
                                            </span>

                                            <button
                                              type="button"
                                              onClick={() => handleStockAdjustment(product.id, v.id, 1)}
                                              disabled={isAdjusting}
                                              title="Increment 1 unit"
                                              className="w-6 h-6 flex items-center justify-center bg-[#181820] hover:bg-[#252532] text-neutral-300 hover:text-white border border-[#2D2D3A] disabled:opacity-30 transition-colors"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </td>

                                        {/* Variant Stock Health */}
                                        <td className="p-2.5">
                                          {vStock === 0 ? (
                                            <span className="text-[9px] text-rose-400 bg-rose-950/30 border border-rose-900/50 px-1.5 py-0.5 uppercase">
                                              Out of Stock
                                            </span>
                                          ) : vStock <= 5 ? (
                                            <span className="text-[9px] text-amber-300 bg-amber-950/30 border border-amber-900/50 px-1.5 py-0.5 uppercase">
                                              Low Stock
                                            </span>
                                          ) : (
                                            <span className="text-[9px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-1.5 py-0.5 uppercase">
                                              Optimal
                                            </span>
                                          )}
                                        </td>

                                        {/* Inline Barcode Visual Rendering */}
                                        <td className="p-2.5 text-center">
                                          <div
                                            onClick={() => copyBarcodeText(vBarcode)}
                                            title="Click to copy barcode payload"
                                            className="inline-flex flex-col items-center p-1.5 bg-[#050507] border border-[#1E1E26] hover:border-amber-400 cursor-pointer transition-colors"
                                          >
                                            <Barcode
                                              value={vBarcode}
                                              height={32}
                                              width={1.2}
                                              theme="terminal"
                                              displayValue={false}
                                            />
                                            <span className="text-[8px] font-mono text-neutral-400 mt-1">
                                              {vBarcode}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Print Thermal Label Action */}
                                        <td className="p-2.5 text-right pr-4">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => printSingleVariantLabel(product, v)}
                                            className="bg-[#141418] border-[#27272F] text-neutral-200 hover:text-white text-xs px-2.5 py-1 flex items-center gap-1.5 ml-auto"
                                          >
                                            <Printer className="w-3 h-3 text-amber-400" />
                                            Print Label
                                          </Button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ========================================================================= */}
      {/* THERMAL WAREHOUSE LABEL PRINT MODAL & @MEDIA PRINT CONTAINER              */}
      {/* ========================================================================= */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#101014] border border-[#27272F] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#23232A]">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Thermal Warehouse Label Engine
                </h3>
                <span className="text-xs text-neutral-500">
                  ({labelsToPrint.length} labels queued)
                </span>
              </div>
              <button
                onClick={() => setPrintModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Preview Body */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
              <div className="p-3 bg-[#0A0A0D] border border-amber-900/30 text-amber-300 text-xs">
                Labels formatted for standard 2.25&quot; &times; 1.25&quot; or 4&quot; &times; 2&quot; direct-thermal printers (Zebra ZD421, Dymo LabelWriter, Rollo).
              </div>

              {/* Label Preview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {labelsToPrint.map((label, idx) => (
                  <div
                    key={`${label.sku}-${idx}`}
                    className="p-3.5 bg-white text-black border-2 border-black flex flex-col justify-between h-44 font-mono select-none"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-black pb-1">
                        <span className="text-[9px] font-bold tracking-tight uppercase line-clamp-1">
                          ATELIER GUSTAVO
                        </span>
                        <span className="text-[11px] font-black border border-black px-1.5">
                          SIZE: {label.size}
                        </span>
                      </div>
                      <h4 className="text-[11px] font-black uppercase mt-1 line-clamp-1">
                        {label.productTitle}
                      </h4>
                      <p className="text-[8px] text-neutral-600 line-clamp-1">
                        {label.productMaterial || 'Organic French Terry'}
                      </p>
                    </div>

                    {/* Barcode Vector */}
                    <div className="flex flex-col items-center justify-center my-1">
                      <Barcode
                        value={label.barcode}
                        height={38}
                        width={1.4}
                        theme="print"
                        displayValue={false}
                      />
                      <span className="text-[9px] font-bold tracking-widest mt-0.5">
                        {label.barcode}
                      </span>
                    </div>

                    <div className="flex justify-between items-end border-t border-black pt-1 text-[9px]">
                      <span className="font-bold">SKU: {label.sku}</span>
                      <span className="font-black text-[11px]">
                        ${label.productPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#23232A] bg-[#0A0A0D]">
              <span className="text-xs text-neutral-500">
                Ensure printer driver is set to 203 DPI / Label Stock
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrintModalOpen(false)}
                  className="bg-[#141418] border-[#27272F] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={executePrint}
                  className="bg-[#166534] hover:bg-[#14532d] text-white font-semibold text-xs border-none flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Send to Thermal Printer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIDDEN @MEDIA PRINT STYLESHEET CONTAINER                                  */}
      {/* Formatted exclusively for physical thermal adhesive stickers              */}
      {/* ========================================================================= */}
      <div id="thermal-print-area" className="hidden">
        {labelsToPrint.map((label, idx) => (
          <div
            key={`print-${label.sku}-${idx}`}
            className="thermal-label-page"
            style={{
              pageBreakAfter: 'always',
              pageBreakInside: 'avoid',
              width: '100%',
              maxWidth: '380px',
              padding: '12px',
              fontFamily: 'monospace',
              color: '#000000',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #000', paddingBottom: '3px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>ATELIER GUSTAVO PARIS</span>
              <span style={{ fontSize: '12px', fontWeight: '900', border: '1.5px solid #000', padding: '1px 5px' }}>SIZE: {label.size}</span>
            </div>

            <div style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>
              {label.productTitle}
            </div>
            <div style={{ fontSize: '8px', color: '#333333', marginBottom: '6px' }}>
              {label.productMaterial || '480 GSM French Terry'}
            </div>

            {/* Barcode Vector */}
            <div style={{ textAlign: 'center', margin: '6px 0' }}>
              <Barcode
                value={label.barcode}
                height={46}
                width={1.6}
                theme="print"
                displayValue={false}
              />
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', marginTop: '2px' }}>
                {label.barcode}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #000', paddingTop: '3px', marginTop: '4px', fontSize: '10px', fontWeight: '700' }}>
              <span>SKU: {label.sku}</span>
              <span style={{ fontSize: '12px', fontWeight: '900' }}>${label.productPrice.toFixed(2)} USD</span>
            </div>
          </div>
        ))}
      </div>

      {/* Global Embedded @media print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-print-area,
          #thermal-print-area * {
            visibility: visible;
          }
          #thermal-print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .thermal-label-page {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  )
}
