'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  getStorefrontProducts,
  getProductVariants,
  type Product,
  type Category,
  type ProductVariant,
} from '@repo/supabase/utils'

function ShopContent() {
  const searchParams = useSearchParams()
  const initialCategoryParam = searchParams.get('category') || 'All'

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam)
  const [sortBy, setSortBy] = useState<'curated' | 'price-asc' | 'price-desc'>('curated')
  const [isLoading, setIsLoading] = useState(true)

  // Sync category state with URL param if it changes
  useEffect(() => {
    if (initialCategoryParam) {
      setSelectedCategory(initialCategoryParam)
    }
  }, [initialCategoryParam])

  // Load Categories and Products dynamically from Supabase
  useEffect(() => {
    async function loadShopData() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()
        const [cats, prods] = await Promise.all([
          getCategories(supabase),
          getStorefrontProducts(
            supabase,
            selectedCategory === 'All' ? undefined : selectedCategory
          ),
        ])
        setCategories(cats)
        setProducts(prods)

        // Fetch variants for products
        const vMap: Record<string, ProductVariant[]> = {}
        await Promise.all(
          prods.map(async (p) => {
            const vars = await getProductVariants(supabase, p.id)
            vMap[p.id] = vars
          })
        )
        setVariantsMap(vMap)
      } finally {
        setIsLoading(false)
      }
    }
    loadShopData()
  }, [selectedCategory])

  // Sorting
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price
    if (sortBy === 'price-desc') return b.price - a.price
    return 0
  })

  return (
    <div className="min-h-screen px-4 sm:px-8 lg:px-12 py-8 max-w-7xl mx-auto space-y-10">
      {/* Editorial Page Title Header */}
      <div className="pt-6 pb-8 border-b border-black space-y-4">
        <div className="flex items-center gap-3 text-xs uppercase font-mono text-neutral-400 font-semibold">
          <span>COLLECTION 01</span>
          <span>•</span>
          <span className="text-[#166534]">AUTONOMOUS APPAREL</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-black leading-[0.95]">
          CURRENT <span className="text-[#166534] font-serif italic font-normal lowercase">garments</span>
        </h1>
        <p className="max-w-2xl text-xs sm:text-sm text-neutral-600 font-light leading-relaxed">
          Engineered heavyweight silhouettes cut from custom 480 GSM French Terry, 14oz Japanese selvedge denim, and technical outerwear. Made exclusively for the clothing creator.
        </p>

        {/* Dynamic Category Pill Navigation */}
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 text-xs uppercase font-mono font-medium tracking-wider transition-all border ${
              selectedCategory === 'All'
                ? 'bg-[#166534] text-white border-[#166534] shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:text-black hover:border-black'
            }`}
          >
            All Silhouettes
          </button>

          {categories.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase() === cat.name.toLowerCase() ||
              selectedCategory.toLowerCase() === cat.slug.toLowerCase()

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug || cat.name)}
                className={`px-3 py-1.5 text-xs uppercase font-mono font-medium tracking-wider transition-all border ${
                  isSelected
                    ? 'bg-[#166534] text-white border-[#166534] shadow-sm'
                    : 'bg-white border-neutral-300 text-neutral-600 hover:text-black hover:border-black'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter / Sort Bar */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md py-3 flex flex-wrap items-center justify-between border-b border-neutral-200 text-xs font-mono">
        <div className="flex items-center gap-6">
          <span className="text-xs uppercase text-neutral-500 font-medium">
            Showing {sortedProducts.length} Silhouettes {selectedCategory !== 'All' ? `in ${selectedCategory}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs uppercase font-medium">
          <span className="text-neutral-400 hidden sm:inline">SORT ORDER:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent border border-neutral-300 px-2 py-1 text-xs uppercase text-neutral-900 focus:outline-none cursor-pointer"
          >
            <option value="curated">Curated Index</option>
            <option value="price-asc">Price (Ascending)</option>
            <option value="price-desc">Price (Descending)</option>
          </select>
        </div>
      </div>

      {/* Apparel Grid matching Homepage exactly */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {sortedProducts.map((item) => {
          const variants = variantsMap[item.id] || []
          const activeSizes = variants.filter((v) => v.stock > 0).map((v) => v.size)

          return (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className="group flex flex-col justify-between h-full border border-neutral-200/80 hover:border-black p-4 bg-white transition-all duration-300 shadow-sm hover:shadow-md"
            >
              {/* Product Image */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 border border-neutral-200/60">
                <Image
                  src={item.image_url || '/images/prod1-primary.jpg'}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
              </div>

              {/* Details */}
              <div className="space-y-2 pt-3">
                <div className="flex justify-between items-baseline gap-2">
                  <h3 className="text-sm sm:text-base font-bold uppercase text-black group-hover:text-[#166534] transition-colors truncate">
                    {item.title}
                  </h3>
                  <span className="font-mono text-sm text-neutral-900 font-bold shrink-0">
                    ${Number(item.price).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-neutral-500 font-light truncate">
                  {item.material || item.category}
                </p>

                {/* Size Matrix Availability Chips */}
                <div className="pt-2 flex items-center justify-between border-t border-neutral-100 text-[10px] font-mono">
                  <span className="text-neutral-400 uppercase">Available Sizes:</span>
                  <div className="flex items-center gap-1 font-semibold text-neutral-800">
                    {activeSizes.length > 0 ? (
                      activeSizes.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300/80 group-hover:border-black transition-colors"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-rose-500 font-bold">SOLD OUT</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {sortedProducts.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center space-y-4 border border-neutral-200 p-8">
            <h2 className="text-2xl font-black uppercase text-black">NO SILHOUETTES LISTED</h2>
            <p className="text-xs text-neutral-500 font-mono">
              All garments in this category are presently being milled or allocated.
            </p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="text-xs uppercase font-mono font-bold text-black underline underline-offset-4"
            >
              View All Silhouettes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LuxuryShopPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-neutral-400">Loading Apparel Catalogue...</div>}>
      <ShopContent />
    </Suspense>
  )
}
