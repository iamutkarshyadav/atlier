'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Zap,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ArrowRight,
  Check,
  RotateCcw,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  DEFAULT_PRODUCTS,
  type Product,
  type Category,
  type ProductVariant,
} from '@repo/supabase/utils'
import { useCartStore } from '../../store/useCartStore'

// Secondary image pairings for sleek hover crossfade
const SECONDARY_IMAGES: Record<string, string> = {
  'b1000000-0000-0000-0000-000000000001': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000002': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000003': 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000004': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000005': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
  'b1000000-0000-0000-0000-000000000006': 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1200&q=85',
}

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '30', '32', '34', 'Taille 01', 'Taille 02']
const AVAILABLE_COLORS = [
  { name: 'Vintage Black', hex: '#1C1C1C' },
  { name: 'Natural Ecru', hex: '#F0EAE1' },
  { name: 'Washed Ink', hex: '#2A303C' },
  { name: 'Raw Indigo', hex: '#1B2A4A' },
]

function ShopContent() {
  const searchParams = useSearchParams()
  const initialCategoryParam = searchParams.get('category') || 'All'

  const [categories, setCategories] = useState<Category[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [priceTier, setPriceTier] = useState<'all' | 'under-5000' | '5000-12000' | 'above-12000'>('all')
  const [sortBy, setSortBy] = useState<'curated' | 'price-asc' | 'price-desc'>('curated')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Collapsible section toggles
  const [openSections, setOpenSections] = useState({
    categories: true,
    sizes: true,
    colors: true,
    price: true,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Cart action
  const addItem = useCartStore((s) => s.addItem)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Sync category state with URL param
  useEffect(() => {
    if (initialCategoryParam) {
      setSelectedCategory(initialCategoryParam)
    }
  }, [initialCategoryParam])

  // Single Joined Data Load
  useEffect(() => {
    async function loadShopData() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()

        const [cats, joinedRes] = await Promise.all([
          getCategories(supabase),
          supabase
            .from('products')
            .select('*, product_variants(*), categories(*)')
            .eq('is_archived', false),
        ])

        setCategories(cats)

        if (joinedRes.error || !joinedRes.data || joinedRes.data.length === 0) {
          setAllProducts(DEFAULT_PRODUCTS)
          return
        }

        const vMap: Record<string, ProductVariant[]> = {}
        const prods: Product[] = (joinedRes.data as unknown as Array<{
          id: string
          title: string
          description: string | null
          price: number
          stock: number
          image_url: string | null
          category_id: string | null
          category?: string | null
          material: string | null
          edition: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
          product_variants?: ProductVariant[]
          categories?: Category | null
        }>).map((row) => {
          const variants: ProductVariant[] = Array.isArray(row.product_variants)
            ? row.product_variants
            : []
          vMap[row.id] = variants

          const categoryObj = row.categories

          return {
            id: row.id,
            title: row.title,
            description: row.description,
            price: Number(row.price),
            stock: Number(row.stock),
            image_url: row.image_url,
            category_id: row.category_id,
            category: row.category || categoryObj?.name || 'Apparel',
            material: row.material,
            edition: row.edition,
            is_archived: row.is_archived,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        })

        setAllProducts(prods)
        setVariantsMap(vMap)
      } finally {
        setIsLoading(false)
      }
    }
    loadShopData()
  }, [])

  // Filter application
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Category Filter
      if (selectedCategory !== 'All') {
        const sel = selectedCategory.toLowerCase()
        const catName = (product.category || '').toLowerCase()
        const matchCat = categories.find(
          (c) => c.slug.toLowerCase() === sel || c.name.toLowerCase() === sel
        )
        const matchesCategory =
          catName === sel ||
          (matchCat && catName === matchCat.name.toLowerCase()) ||
          (matchCat && product.category_id === matchCat.id)
        if (!matchesCategory) return false
      }

      // 2. Size Filter
      if (selectedSize) {
        const variants = variantsMap[product.id] || []
        const hasSize = variants.some(
          (v) => v.size?.toLowerCase() === selectedSize.toLowerCase() && v.stock > 0
        )
        if (!hasSize) return false
      }

      // 3. Color Filter
      if (selectedColor) {
        const variants = variantsMap[product.id] || []
        const hasColor = variants.some(
          (v) => v.color?.toLowerCase() === selectedColor.toLowerCase()
        )
        // Also check title/material
        const titleMatch = product.title.toLowerCase().includes(selectedColor.toLowerCase())
        if (!hasColor && !titleMatch) return false
      }

      // 4. Price Tier Filter
      const price = Number(product.price)
      if (priceTier === 'under-5000' && price >= 5000) return false
      if (priceTier === '5000-12000' && (price < 5000 || price > 12000)) return false
      if (priceTier === 'above-12000' && price <= 12000) return false

      return true
    })
  }, [allProducts, selectedCategory, selectedSize, selectedColor, priceTier, categories, variantsMap])

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      return 0
    })
  }, [filteredProducts, sortBy])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategory !== 'All') count++
    if (selectedSize) count++
    if (selectedColor) count++
    if (priceTier !== 'all') count++
    return count
  }, [selectedCategory, selectedSize, selectedColor, priceTier])

  const clearAllFilters = () => {
    setSelectedCategory('All')
    setSelectedSize(null)
    setSelectedColor(null)
    setPriceTier('all')
    setSortBy('curated')
  }

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()

    const variants = variantsMap[product.id] || []
    const firstAvailable = variants.find((v) => v.stock > 0) || variants[0]

    const added = addItem({
      id: firstAvailable ? `${product.id}-${firstAvailable.id}` : product.id,
      productId: product.id,
      title: product.title,
      category: product.category || 'Drop 01',
      edition: product.edition || '100% Cotton',
      price: firstAvailable?.price_override ?? product.price,
      quantity: 1,
      image: product.image_url || '/images/prod1-primary.jpg',
      size: firstAvailable?.size || 'M',
    })

    if (added) {
      setToastMessage(`${product.title} added to Bolt ⚡ Try-On bag`)
      setTimeout(() => setToastMessage(null), 3000)
    } else {
      setToastMessage('Bolt ⚡ limit: maximum 5 garments per fitting session.')
      setTimeout(() => setToastMessage(null), 3500)
    }
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white selection:bg-[#B91C1C] selection:text-white pb-28">
      {/* Editorial Page Header */}
      <div className="border-b border-white/10 bg-[#1A1B1D] px-6 sm:px-12 py-12">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-3 text-xs uppercase font-mono text-neutral-400 font-semibold tracking-[0.2em]">
            <span>COLLECTION 01</span>
            <span>•</span>
            <span className="text-[#B91C1C] flex items-center gap-1 font-bold">
              <Zap className="w-3.5 h-3.5 fill-[#B91C1C] text-[#B91C1C]" />
              BOLT ⚡ DOORSTEP SALON AVAILABLE
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-white font-display">
                Apparel <span className="text-[#B91C1C] ml-2">Catalogue</span>
              </h1>
              <p className="max-w-xl text-xs sm:text-sm text-[#8E8E93] font-light mt-1.5 leading-relaxed font-sans">
                480 GSM loopback cotton, 14oz Japanese raw selvedge, and architectural tailored cuts. Select up to 5 pieces for home fitting.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFilterOpen(true)}
                style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                className="btn-dark lg:hidden px-5 py-2.5 hover:bg-neutral-800 text-xs font-mono uppercase tracking-widest flex items-center gap-2 rounded-none border border-neutral-800 dark:border-white/15 transition-all shadow-md cursor-pointer"
              >
                <Filter style={{ color: '#ffffff' }} className="w-3.5 h-3.5" />
                <span style={{ color: '#ffffff' }}>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-neutral-400 hidden sm:inline uppercase tracking-widest">SORT:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'curated' | 'price-asc' | 'price-desc')}
                  className="bg-[#18181A] border border-white/15 px-3.5 py-2 text-xs uppercase font-mono text-white focus:outline-none focus:border-red-600 rounded-none cursor-pointer"
                >
                  <option value="curated">Curated Index</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Layout: Sidebar + High-Density Grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-10">
        <div className="flex gap-10">
          {/* ========================================================= */}
          {/* DESKTOP SIDEBAR FILTERS */}
          {/* ========================================================= */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-8 font-mono text-xs bg-[#1A1B1D] border border-white/10 p-5 rounded-none shadow-2xl h-fit">
            {/* Active Filters Clear Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-xs uppercase tracking-wider font-bold text-white">
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-red-400 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* 1. Category Filter */}
            <div className="space-y-3 pb-6 border-b border-white/10">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between text-xs uppercase font-bold tracking-wider text-neutral-300 cursor-pointer"
              >
                <span>Category</span>
                {openSections.categories ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.categories && (
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full text-left py-2 px-3 transition-colors flex items-center justify-between rounded-none ${
                      selectedCategory === 'All'
                        ? 'bg-[#2E2F33] text-white font-bold border-l-2 border-[#B91C1C]'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>All Silhouettes</span>
                    <span className="text-[10px]">{allProducts.length}</span>
                  </button>

                  {categories.map((cat) => {
                    const isSelected =
                      selectedCategory.toLowerCase() === cat.name.toLowerCase() ||
                      selectedCategory.toLowerCase() === cat.slug.toLowerCase()

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.slug || cat.name)}
                        className={`w-full text-left py-2 px-3 transition-colors flex items-center justify-between rounded-none ${
                          isSelected
                            ? 'bg-[#2E2F33] text-white font-bold border-l-2 border-[#B91C1C]'
                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Size Filter */}
            <div className="space-y-3 pb-6 border-b border-white/10">
              <button
                onClick={() => toggleSection('sizes')}
                className="w-full flex items-center justify-between text-xs uppercase font-bold tracking-wider text-neutral-300 cursor-pointer"
              >
                <span>Size Matrix</span>
                {openSections.sizes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.sizes && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {AVAILABLE_SIZES.map((size) => {
                    const isSelected = selectedSize === size
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(isSelected ? null : size)}
                        className={`py-2 text-[11px] uppercase border transition-all text-center rounded-none cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black border-white font-bold shadow-md'
                            : 'bg-[#18181A] text-neutral-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 3. Color Filter */}
            <div className="space-y-3 pb-6 border-b border-white/10">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full flex items-center justify-between text-xs uppercase font-bold tracking-wider text-neutral-300 cursor-pointer"
              >
                <span>Tone &amp; Color</span>
                {openSections.colors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.colors && (
                <div className="space-y-2 pt-1">
                  {AVAILABLE_COLORS.map((color) => {
                    const isSelected = selectedColor === color.name
                    return (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(isSelected ? null : color.name)}
                        className={`w-full flex items-center justify-between py-1.5 px-2 border transition-colors rounded-none cursor-pointer ${
                          isSelected
                            ? 'border-red-500 bg-red-950/40 font-bold text-white'
                            : 'border-transparent text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-none border border-neutral-600 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-400" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 4. Price Tier Filter */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('price')}
                className="w-full flex items-center justify-between text-xs uppercase font-bold tracking-wider text-neutral-300 cursor-pointer"
              >
                <span>Price Range</span>
                {openSections.price ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSections.price && (
                <div className="space-y-1.5 pt-1">
                  {[
                    { id: 'all', label: 'All Values' },
                    { id: 'under-5000', label: 'Under ₹5,000' },
                    { id: '5000-12000', label: '₹5,000 – ₹12,000' },
                    { id: 'above-12000', label: 'Above ₹12,000' },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setPriceTier(tier.id as typeof priceTier)}
                      className={`w-full text-left py-2 px-3 transition-colors rounded-none cursor-pointer ${
                        priceTier === tier.id
                          ? 'bg-[#2E2F33] text-white font-bold border-l-2 border-[#B91C1C]'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ========================================================= */}
          {/* HIGH-DENSITY PRODUCT GRID */}
          {/* ========================================================= */}
          <main className="flex-1 space-y-6">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>
                Showing {sortedProducts.length} curated {sortedProducts.length === 1 ? 'silhouette' : 'silhouettes'}
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
              </span>
              <span className="hidden sm:inline">Limited Drop 01 Allocation</span>
            </div>

            {isLoading ? (
              <div className="py-24 text-center space-y-3 font-mono text-xs text-neutral-400">
                <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin rounded-full mx-auto" />
                <p className="uppercase tracking-widest">Loading Royal Garments...</p>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="py-24 text-center space-y-4 border border-white/10 bg-[#1A1B1D] p-8 shadow-xl">
                <p className="text-xl font-light uppercase text-white font-sans">
                  No matching silhouettes found
                </p>
                <p className="text-xs text-[#8E8E93] font-mono max-w-sm mx-auto">
                  Try adjusting or clearing your filters to view other available garments in the drop.
                </p>
                <button
                  onClick={clearAllFilters}
                  style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                  className="btn-dark px-6 py-2.5 hover:bg-[#4A4B50] text-xs font-mono uppercase tracking-wider font-semibold rounded-full transition-colors cursor-pointer shadow-md"
                >
                  <span style={{ color: '#ffffff' }}>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {sortedProducts.map((product) => {
                  const secondaryImage =
                    SECONDARY_IMAGES[product.id] ||
                    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85'
                  const variants = variantsMap[product.id] || []
                  const activeSizes = variants.filter((v) => v.stock > 0).map((v) => v.size)

                  return (
                    <div
                      key={product.id}
                      className="group flex flex-col justify-between bg-[#262629] border border-white/10 hover:border-white/30 transition-all duration-300 shadow-xl rounded-xl overflow-hidden relative"
                    >
                      {/* Product Image Container with Secondary Image Hover Fade */}
                      <Link
                        href={`/product/${product.id}`}
                        className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden bg-neutral-900 block border-b border-white/5"
                      >
                        {/* Primary Image */}
                        <Image
                          src={product.image_url || '/images/prod1-primary.jpg'}
                          alt={product.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover object-center filter contrast-110 transition-all duration-700 ease-out group-hover:opacity-0 group-hover:scale-105"
                        />

                        {/* Secondary Angle Image (Reveals on Hover) */}
                        <Image
                          src={secondaryImage}
                          alt={`${product.title} alternate perspective`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out scale-100 group-hover:scale-105 filter contrast-110"
                        />

                        {/* Top-Left Sleek Red TRY-ON ELIGIBLE Badge */}
                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] sm:text-[10px] font-mono font-bold uppercase bg-[#B91C1C] text-white tracking-wider rounded-full shadow-lg border border-red-500/40 backdrop-blur-sm">
                            <Zap className="w-2.5 h-2.5 fill-white text-white" />
                            TRY-ON ELIGIBLE
                          </span>
                        </div>

                        {/* Quick Add Overlay Pill on Image Hover */}
                        <div className="absolute inset-x-3 bottom-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdd(e, product)}
                            style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                            className="btn-dark w-full py-2.5 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 active:scale-98 transition-all rounded-full border border-neutral-700 dark:border-white/20 backdrop-blur-md cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span style={{ color: '#ffffff' }}>Quick Bolt ⚡ Try-On</span>
                          </button>
                        </div>
                      </Link>

                      {/* Details Box */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 font-mono">
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline text-[10px] text-neutral-400 uppercase tracking-wider">
                            <span>{product.category || 'Atelier Collection'}</span>
                            <span className="truncate max-w-[90px]">{product.edition || 'Drop 01'}</span>
                          </div>

                          <Link
                            href={`/product/${product.id}`}
                            className="block font-serif text-base sm:text-lg font-normal text-white group-hover:text-red-400 transition-colors truncate"
                          >
                            {product.title}
                          </Link>

                          <p className="text-xs text-[#8E8E93] font-sans font-light truncate">
                            {product.material || 'Heavyweight Organic Loopwheel'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-neutral-400">Price</p>
                            <p className="text-sm sm:text-base font-bold text-white font-mono">
                              ₹{Number(product.price).toLocaleString('en-IN')}
                            </p>
                          </div>

                          {/* Text-based CTA: BOOK FITTING -> */}
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdd(e, product)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-neutral-300 group-hover:text-white transition-colors cursor-pointer hover:underline underline-offset-4"
                          >
                            <span>BOOK FITTING</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#B91C1C] transition-transform group-hover:translate-x-1" />
                          </button>
                        </div>

                        {/* Size Matrix Indicator Bar */}
                        {activeSizes.length > 0 && (
                          <div className="pt-1 flex items-center gap-1 text-[9px] text-neutral-400">
                            <span className="uppercase text-[8px] tracking-wider text-neutral-500 mr-1">SIZES:</span>
                            {activeSizes.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 bg-[#1A1B1D] border border-white/10 text-neutral-300 rounded font-mono"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181A] text-white px-5 py-3 border border-white/20 shadow-2xl font-mono text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-none">
          <Zap className="w-4 h-4 fill-red-400 text-red-400 shrink-0" />
          <span>{toastMessage}</span>
          <Link
            href="/cart"
            className="text-red-400 underline underline-offset-4 font-bold ml-2 hover:text-white"
          >
            View Bag →
          </Link>
        </div>
      )}

      {/* Mobile Filters Slide-over / Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end">
          <div className="w-full max-w-xs bg-[#1A1B1D] border-l border-white/10 text-white h-full p-6 space-y-6 overflow-y-auto font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="font-bold text-sm uppercase text-white tracking-widest font-display">Filter Catalogue</span>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Categories */}
            <div className="space-y-2">
              <span className="font-bold uppercase text-neutral-300 block tracking-wider">Category</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 text-xs rounded-none cursor-pointer ${
                    selectedCategory === 'All' ? 'bg-[#2E2F33] text-white font-bold border-l-2 border-[#B91C1C]' : 'bg-[#18181A] text-neutral-300 border border-white/10'
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.slug || c.name)}
                    className={`px-3 py-1.5 text-xs rounded-none cursor-pointer ${
                      selectedCategory.toLowerCase() === (c.slug || c.name).toLowerCase()
                        ? 'bg-[#2E2F33] text-white font-bold border-l-2 border-[#B91C1C]'
                        : 'bg-[#18181A] text-neutral-300 border border-white/10'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Sizes */}
            <div className="space-y-2">
              <span className="font-bold uppercase text-neutral-300 block tracking-wider">Size</span>
              <div className="grid grid-cols-3 gap-1.5">
                {AVAILABLE_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                    className={`py-2 text-xs rounded-none border cursor-pointer ${
                      selectedSize === size ? 'bg-white text-black border-white font-bold' : 'bg-[#18181A] text-neutral-300 border-white/10'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-[#2E2F33] hover:bg-white hover:text-black text-white uppercase font-bold text-xs rounded-none border border-white/15 transition-all cursor-pointer tracking-wider"
              >
                Apply Filters ({sortedProducts.length} Results)
              </button>
              <button
                onClick={clearAllFilters}
                className="w-full py-2.5 border border-white/15 text-neutral-300 hover:text-white uppercase font-semibold text-xs rounded-none cursor-pointer tracking-wider"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LuxuryShopPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-xs font-mono text-zinc-400">
          Loading Luxury Apparel Catalogue...
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  )
}
