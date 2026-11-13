'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  Search,
  Barcode,
  Layers,
  Sparkles,
  Check,
  Zap,
  Tag,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { type Product, type Shelf } from '@repo/supabase/utils'

interface PosCatalogProps {
  products: Product[]
  boutiqueShelves: Shelf[]
  activeLocationCode: string
  onAddToCart: (
    variantId: string,
    productId: string,
    title: string,
    size: string,
    sku: string,
    price: number,
    imageUrl?: string | null,
    category?: string | null,
    material?: string | null,
    isEndlessAisle?: boolean,
    originLocCode?: string
  ) => void
  onBarcodeScanSubmit?: (barcode: string) => void
}

export function PosCatalog({
  products,
  boutiqueShelves,
  activeLocationCode,
  onAddToCart,
  onBarcodeScanSubmit,
}: PosCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [onlyLocalStock, setOnlyLocalStock] = useState(false)
  const [recentlyAddedSize, setRecentlyAddedSize] = useState<string | null>(null)

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['ALL', ...Array.from(set)]
  }, [products])

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false
      }
      // Query match (title, category, material, or id)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = p.title.toLowerCase().includes(q)
        const matchCat = (p.category || '').toLowerCase().includes(q)
        const matchMat = (p.material || '').toLowerCase().includes(q)
        if (!matchTitle && !matchCat && !matchMat) return false
      }
      // Local stock filter
      if (onlyLocalStock && (p.stock || 0) <= 0) {
        return false
      }
      return true
    })
  }, [products, selectedCategory, searchQuery, onlyLocalStock])

  const handleSizeClick = (
    prod: Product,
    size: string,
    isLocalInStock: boolean
  ) => {
    const key = `${prod.id}-${size}`
    setRecentlyAddedSize(key)
    setTimeout(() => {
      setRecentlyAddedSize((curr) => (curr === key ? null : curr))
    }, 700)

    const priceNum = Number(prod.price) || 1200
    const sku = `SKU-${prod.title.slice(0, 4).toUpperCase().replace(/\s/g, '')}-${size}`
    const isEndlessAisle = !isLocalInStock
    const originLoc = isLocalInStock ? activeLocationCode : 'BLR-WH01'

    onAddToCart(
      `v-${prod.id}-${size}`,
      prod.id,
      prod.title,
      size,
      sku,
      priceNum,
      prod.image_url,
      prod.category || 'Atelier',
      prod.material || undefined,
      isEndlessAisle,
      originLoc
    )
  }

  return (
    <div className="flex flex-col h-full bg-chrome-900 border border-chrome-800 rounded-lg overflow-hidden select-none">
      {/* Top Search & Filter Bar */}
      <div className="p-3 bg-chrome-950 border-b border-chrome-800 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim() && onBarcodeScanSubmit) {
                  onBarcodeScanSubmit(searchQuery.trim())
                  setSearchQuery('')
                }
              }}
              placeholder="Search garments, scan SKU/barcode, or press Enter to add..."
              className="w-full bg-chrome-900 border border-chrome-800 rounded pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyLocalStock((prev) => !prev)}
            className={`px-3 py-2 text-2xs font-semibold rounded border transition-colors flex items-center gap-1.5 shrink-0 ${
              onlyLocalStock
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/80'
                : 'bg-chrome-900 text-zinc-400 border-chrome-800 hover:text-zinc-200'
            }`}
            title="Filter only items physically in-stock at this boutique counter"
          >
            <Sparkles className="w-3 h-3" />
            <span>Local Stock Only</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {categories.map((cat) => {
            const count =
              cat === 'ALL'
                ? products.length
                : products.filter((p) => p.category === cat).length
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-2xs font-medium rounded-full transition-all shrink-0 flex items-center gap-1 ${
                  selectedCategory === cat
                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                    : 'bg-chrome-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-chrome-800'
                }`}
              >
                <span>{cat === 'ALL' ? 'All Pieces' : cat}</span>
                <span
                  className={`text-3xs font-mono px-1 rounded-full ${
                    selectedCategory === cat
                      ? 'bg-zinc-300 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Garment Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
            <Tag className="w-8 h-8 stroke-1 text-zinc-600" />
            <p className="text-xs font-medium text-zinc-400">No garments match the current criteria.</p>
            <p className="text-3xs text-zinc-600">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => {
              const priceNum = Number(prod.price) || 1200
              const stockNum = prod.stock || 0
              const isLowStock = stockNum > 0 && stockNum <= 5
              const isOutOfStock = stockNum <= 0

              // Standard size runs depending on category
              const isBottom =
                prod.category?.toLowerCase().includes('pant') ||
                prod.category?.toLowerCase().includes('denim')
              const sizes = isBottom
                ? ['30', '32', '34', '36']
                : ['XS', 'S', 'M', 'L', 'XL']

              return (
                <div
                  key={prod.id}
                  className="bg-chrome-950 hover:bg-chrome-900/80 border border-chrome-800 hover:border-zinc-700/80 rounded-lg p-3 transition-all flex flex-col justify-between space-y-3 group"
                >
                  {/* Top: Image & Essential Meta */}
                  <div className="space-y-2">
                    <div className="relative aspect-[4/3] w-full rounded overflow-hidden bg-zinc-900 border border-zinc-800">
                      {prod.image_url ? (
                        <Image
                          src={prod.image_url}
                          alt={prod.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-3xs uppercase font-mono">
                          Atelier Garment
                        </div>
                      )}

                      {/* Stock Badge Overlay */}
                      <div className="absolute top-2 right-2">
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-cyan-950/90 text-cyan-400 border border-cyan-800/80 rounded backdrop-blur-sm flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Endless Aisle
                          </span>
                        ) : isLowStock ? (
                          <span className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700/80 rounded backdrop-blur-sm">
                            Only {stockNum} left
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-3xs font-mono font-semibold bg-zinc-900/90 text-emerald-400 border border-zinc-700/80 rounded backdrop-blur-sm">
                            {stockNum} in stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-3xs uppercase font-semibold text-zinc-500 tracking-wider block">
                        {prod.category || 'Garment'}
                      </span>
                      <h4 className="text-xs font-semibold text-zinc-100 truncate tracking-tight" title={prod.title}>
                        {prod.title}
                      </h4>
                      {prod.material && (
                        <p className="text-3xs text-zinc-400 truncate mt-0.5" title={prod.material}>
                          {prod.material}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Price & Quick Size Addition Pills */}
                  <div className="pt-2 border-t border-chrome-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xs text-zinc-400">Unit Price</span>
                      <span className="font-mono font-bold text-sm text-zinc-100 tabular-nums">
                        ${priceNum.toFixed(2)}
                      </span>
                    </div>

                    {/* Size Selector Grid */}
                    <div className="grid grid-cols-5 gap-1">
                      {sizes.map((sz, sIdx) => {
                        const isLocalInStock = sIdx < 3 && !isOutOfStock
                        const wasJustAdded = recentlyAddedSize === `${prod.id}-${sz}`

                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleSizeClick(prod, sz, isLocalInStock)}
                            className={`py-1 rounded text-3xs font-mono font-bold border transition-all flex items-center justify-center gap-0.5 ${
                              wasJustAdded
                                ? 'bg-emerald-500 text-black border-emerald-400 scale-95'
                                : isLocalInStock
                                ? 'bg-zinc-900 hover:bg-emerald-950/60 border-zinc-800 hover:border-emerald-700 text-zinc-200 hover:text-emerald-300'
                                : 'bg-zinc-950/60 hover:bg-cyan-950/60 border-dashed border-zinc-800/80 hover:border-cyan-700 text-zinc-500 hover:text-cyan-300'
                            }`}
                            title={
                              isLocalInStock
                                ? `In Stock at ${activeLocationCode} (Sales Floor FLR)`
                                : 'Endless Aisle: Dispatched from Central Mother Warehouse'
                            }
                          >
                            {wasJustAdded ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (
                              <>
                                <span>{sz}</span>
                                {!isLocalInStock && <span className="text-cyan-400 text-[8px]">⚡</span>}
                              </>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
