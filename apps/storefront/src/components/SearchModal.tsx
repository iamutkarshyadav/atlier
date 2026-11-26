'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, TrendingUp, Loader2 } from 'lucide-react'
import { type Category, type Product, DEFAULT_PRODUCTS } from '@repo/supabase/utils'
import type { ProductPricingSummary } from '@repo/supabase/pricing'
import { ProductImage } from './ui/ProductImage'

export interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  categories?: Category[]
}

const DEFAULT_TRENDING = [
  '480 GSM Hoodie',
  'Selvedge Denim',
  'Kurta Sets',
  'Flight Bomber',
  'Linen Tops',
]

function toTitleCase(label: string): string {
  const minor = new Set(['&', 'and', 'of', 'in', 'for', 'the'])
  return label
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase()
      if (idx > 0 && minor.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function SearchModal({ isOpen, onClose, categories = [] }: SearchModalProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS.slice(0, 4))
  const [pricingMap, setPricingMap] = useState<Record<string, ProductPricingSummary>>({})
  const [matchedCategories, setMatchedCategories] = useState<Category[]>([])
  const [trending, setTrending] = useState<string[]>(DEFAULT_TRENDING)
  const [isSearching, setIsSearching] = useState(false)

  // Handle native <dialog> open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } else {
      if (dialog.open) {
        dialog.close()
      }
      setQuery('')
    }
  }, [isOpen])

  // Debounced (200ms) predictive search with AbortController
  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    const trimmed = query.trim()

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        if (!controller.signal.aborted && data.success) {
          setProducts(Array.isArray(data.products) ? data.products.slice(0, 4) : [])
          setPricingMap(data.pricingMap || {})
          setMatchedCategories(Array.isArray(data.categories) ? data.categories : [])
          if (Array.isArray(data.trending) && data.trending.length > 0) {
            setTrending(data.trending)
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Retain current fallback state gracefully
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, trimmed ? 200 : 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [isOpen, query])

  // Dismiss when clicking outside dialog bounding box
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    if (!isInDialog) {
      onClose()
    }
  }

  const quickCategories = useMemo(() => {
    if (matchedCategories.length > 0) return matchedCategories.slice(0, 6)
    return categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 6)
  }, [matchedCategories, categories])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    onClose()
    if (trimmed) {
      router.push(`/shop?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/shop')
    }
  }

  const handleSelectProduct = (productId: string) => {
    onClose()
    router.push(`/product/${productId}`)
  }

  const handleSelectCategory = (slugOrName: string) => {
    onClose()
    router.push(`/shop?category=${encodeURIComponent(slugOrName)}`)
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      style={{ overscrollBehavior: 'contain' }}
      className="fixed top-10 sm:top-16 inset-x-0 mx-auto z-50 w-[calc(100%-1.5rem)] max-w-4xl bg-white border border-[#d3d6db] rounded-sm shadow-lg p-0 overflow-hidden text-[#14293a] font-sans backdrop:bg-black/45 backdrop:backdrop-blur-xs"
    >
      <div className="flex flex-col max-h-[84vh]">
        {/* Search Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center border-b border-[#e5e7eb] px-4 sm:px-5 py-3.5 bg-white"
        >
          <Search className="w-4 h-4 text-[#6c7079] shrink-0 mr-3" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for hoodies, kurta sets, jackets, denim..."
            className="w-full bg-transparent text-sm text-[#14293a] placeholder:text-[#8a909a] focus:outline-none"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-[#6c7079] animate-spin mr-2 shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#8a909a] hover:text-[#14293a] transition-colors mr-2 cursor-pointer"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-[#6c7079] hover:text-[#14293a] border border-[#e5e7eb] rounded-sm cursor-pointer"
            aria-label="Close search"
          >
            Esc
          </button>
        </form>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Row: Trending Searches + Matching Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-5 border-b border-[#e5e7eb]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079] flex items-center gap-1.5 mb-2.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#b91c1c]" strokeWidth={1.75} />
                <span>Trending Searches</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {trending.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#f8f8f8] hover:bg-[#14293a] text-[#14293a] hover:text-white border border-[#d3d6db] rounded-sm transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {quickCategories.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079] block mb-2.5">
                  {query.trim() ? 'Matching Categories' : 'Browse Categories'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.slug || cat.name)}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-[#f8f8f8] border border-[#d3d6db] hover:border-[#14293a] rounded-sm transition-colors cursor-pointer text-[#14293a]"
                    >
                      {toTitleCase(cat.name)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4 Live Product Preview Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079]">
                {query.trim() ? 'Matching Garments' : 'Popular Pieces'}
              </span>
              {query.trim() && (
                <span className="text-[11px] text-[#6c7079] tabular-nums">
                  {products.length} {products.length === 1 ? 'result' : 'results'} shown
                </span>
              )}
            </div>

            {products.length === 0 && !isSearching ? (
              <div className="py-10 text-center bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm text-xs text-[#6c7079]">
                No pieces found matching &ldquo;{query}&rdquo;. Press Enter to view all catalog items.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {products.slice(0, 4).map((prod) => {
                  const pricing = pricingMap[prod.id]
                  const selling = pricing?.sellingPrice ?? Number(prod.price)
                  const mrp = pricing?.mrp ?? Number((prod as any).compare_at_price || 0)

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProduct(prod.id)}
                      className="group text-left flex flex-col bg-white border border-[#e5e7eb] hover:border-[#14293a] rounded-sm overflow-hidden transition-colors cursor-pointer"
                    >
                      <div className="relative aspect-[3/4] w-full bg-[#f5f5f4] overflow-hidden">
                        <ProductImage
                          src={prod.image_url}
                          alt={prod.title}
                          fill
                          sizes="(max-width: 640px) 45vw, 200px"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5 space-y-1">
                        <p className="text-xs font-medium text-neutral-900 group-hover:text-[#b91c1c] transition-colors truncate">
                          {prod.title}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-bold text-neutral-950 tabular-nums">
                            ₹{Math.round(selling).toLocaleString('en-IN')}
                          </span>
                          {mrp > selling && (
                            <span className="text-[11px] text-neutral-400 line-through tabular-nums">
                              ₹{Math.round(mrp).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#f8f8f8] border-t border-[#e5e7eb] flex items-center justify-between text-xs text-[#6c7079]">
          <span className="truncate mr-3">
            {query.trim() ? (
              <span>
                Press <span className="font-semibold text-[#14293a]">Enter</span> to search all results for &ldquo;{query}&rdquo;
              </span>
            ) : (
              <span>Type to search by silhouette, fabric, or category</span>
            )}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            className="font-bold text-[#b91c1c] hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>View all in shop</span>
            <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </dialog>
  )
}
