'use client'

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Zap,
  Filter,
  X,
  Check,
  RotateCcw,
} from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  getCollections,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_VARIANTS,
  DEFAULT_COLLECTIONS,
  type Product,
  type Category,
  type ProductVariant,
  type CollectionWithRelations,
} from '@repo/supabase/utils'
import {
  getEffectiveProductPricing,
  type ProductPricingSummary,
  type PromotionWithRules,
} from '@repo/supabase/pricing'
import { useCartStore } from '../../store/useCartStore'
import { ProductCard } from '../../components/ProductCard'
import ShopFilterPanel, {
  extractVariantColorFacets,
  extractVariantSizeFacets,
  formatPriceRangeLabel,
} from '../../components/shop/ShopFilterPanel'

type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'newest' | 'discount-desc'

function parseSortParam(val: string | null): SortOption {
  if (val === 'newest' || val === 'price-asc' || val === 'price-desc' || val === 'discount-desc') {
    return val
  }
  return 'recommended'
}

function parsePriceParam(val: string | null): number | null {
  if (!val) return null
  const num = Number(val)
  return Number.isFinite(num) && num >= 0 ? num : null
}

function buildShopQueryString(state: {
  selectedCategory: string
  searchQuery: string
  selectedSize: string | null
  selectedColor: string | null
  minPrice: number | null
  maxPrice: number | null
  tryOnOnly: boolean
  onSaleOnly: boolean
  minDiscount: number | null
  sortBy: SortOption
  selectedCollectionSlug: string | null
}): string {
  const params = new URLSearchParams()
  if (state.selectedCollectionSlug) params.set('collection', state.selectedCollectionSlug)
  if (state.selectedCategory !== 'All') params.set('category', state.selectedCategory)
  if (state.searchQuery.trim()) params.set('q', state.searchQuery.trim())
  if (state.selectedSize) params.set('size', state.selectedSize)
  if (state.selectedColor) params.set('color', state.selectedColor)
  if (state.minPrice !== null) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== null) params.set('maxPrice', String(state.maxPrice))
  if (state.tryOnOnly) params.set('delivery', 'try_on')
  if (state.onSaleOnly) params.set('onSale', 'true')
  if (state.minDiscount !== null) params.set('minDiscount', String(state.minDiscount))
  if (state.sortBy !== 'recommended') params.set('sort', state.sortBy)
  return params.toString()
}

function ShopContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialCategoryParam = searchParams.get('category') || 'All'
  const collectionParam = searchParams.get('collection')
  const queryParam = searchParams.get('q') || searchParams.get('search') || ''
  const sizeParam = searchParams.get('size')
  const colorParam = searchParams.get('color')
  const minPriceParam = parsePriceParam(searchParams.get('minPrice'))
  const maxPriceParam = parsePriceParam(searchParams.get('maxPrice'))
  const deliveryParam = searchParams.get('delivery')
  const minDiscountParam = searchParams.get('minDiscount')
  const onSaleParam = searchParams.get('onSale') === 'true'
  const initialSort = parseSortParam(searchParams.get('sort'))

  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<CollectionWithRelations[]>(DEFAULT_COLLECTIONS)
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(collectionParam)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})
  const [pricingMap, setPricingMap] = useState<Record<string, ProductPricingSummary>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam)
  const [searchQuery, setSearchQuery] = useState<string>(queryParam)
  const [selectedSize, setSelectedSize] = useState<string | null>(sizeParam || null)
  const [selectedColor, setSelectedColor] = useState<string | null>(colorParam || null)
  const [minPrice, setMinPrice] = useState<number | null>(minPriceParam)
  const [maxPrice, setMaxPrice] = useState<number | null>(maxPriceParam)
  const [tryOnOnly, setTryOnOnly] = useState<boolean>(deliveryParam === 'try_on')
  const [minDiscount, setMinDiscount] = useState<number | null>(
    minDiscountParam ? parseInt(minDiscountParam, 10) || null : null
  )
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(onSaleParam)
  const [sortBy, setSortBy] = useState<SortOption>(initialSort)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  const lastSyncedQueryRef = useRef<string>(searchParams.toString())
  const skipNextUrlWriteRef = useRef<boolean>(false)

  // Category Tree Structure
  const { parentCategories, subcategoriesMap } = useMemo(() => {
    const parents = categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    const subMap: Record<string, Category[]> = {}
    categories.forEach((c) => {
      if (c.parent_id) {
        if (!subMap[c.parent_id]) subMap[c.parent_id] = []
        subMap[c.parent_id].push(c)
      }
    })
    Object.keys(subMap).forEach((pId) => {
      subMap[pId].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    })
    return { parentCategories: parents, subcategoriesMap: subMap }
  }, [categories])

  // Active Parent Category resolution for cascading pills
  const activeParentCategory = useMemo(() => {
    if (selectedCategory === 'All') return null
    const sel = selectedCategory.toLowerCase()
    const parent = parentCategories.find(
      (p) => p.name.toLowerCase() === sel || p.slug.toLowerCase() === sel
    )
    if (parent) return parent

    const child = categories.find(
      (c) => c.slug.toLowerCase() === sel || c.name.toLowerCase() === sel
    )
    if (child?.parent_id) {
      return parentCategories.find((p) => p.id === child.parent_id) || null
    }
    return null
  }, [selectedCategory, parentCategories, categories])

  const getCategoryCount = (cat: Category) => {
    const ids = new Set<string>([cat.id])
    const names = new Set<string>([cat.name.toLowerCase()])
    if (!cat.parent_id) {
      const children = subcategoriesMap[cat.id] || []
      children.forEach((c) => {
        ids.add(c.id)
        names.add(c.name.toLowerCase())
      })
    }
    return allProducts.filter(
      (p) => (p.category_id && ids.has(p.category_id)) || names.has((p.category || '').toLowerCase())
    ).length
  }

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    categories.forEach((cat) => {
      counts[cat.name] = getCategoryCount(cat)
    })
    return counts
  }, [categories, allProducts, subcategoriesMap])

  const availableSizes = useMemo(
    () => extractVariantSizeFacets(allProducts, variantsMap),
    [allProducts, variantsMap]
  )

  const availableColors = useMemo(
    () => extractVariantColorFacets(allProducts, variantsMap),
    [allProducts, variantsMap]
  )

  const boltEligibleCount = useMemo(
    () => allProducts.filter((p) => p.is_try_on_eligible !== false).length,
    [allProducts]
  )

  const onSaleCount = useMemo(
    () => allProducts.filter((p) => (pricingMap[p.id]?.discountPercentage || 0) > 0).length,
    [allProducts, pricingMap]
  )

  // Cart action
  const addItem = useCartStore((s) => s.addItem)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Hydrate filter state when URL changes externally (Navbar click, Back/Forward)
  useEffect(() => {
    const qs = searchParams.toString()
    if (lastSyncedQueryRef.current === qs) return
    lastSyncedQueryRef.current = qs
    skipNextUrlWriteRef.current = true

    setSelectedCategory(searchParams.get('category') || 'All')
    setSelectedCollectionSlug(searchParams.get('collection') || null)
    setSearchQuery(searchParams.get('q') || searchParams.get('search') || '')
    setSelectedSize(searchParams.get('size') || null)
    setSelectedColor(searchParams.get('color') || null)
    setMinPrice(parsePriceParam(searchParams.get('minPrice')))
    setMaxPrice(parsePriceParam(searchParams.get('maxPrice')))
    setTryOnOnly(searchParams.get('delivery') === 'try_on')
    setOnSaleOnly(searchParams.get('onSale') === 'true')
    const rawMinDisc = searchParams.get('minDiscount')
    setMinDiscount(rawMinDisc ? parseInt(rawMinDisc, 10) || null : null)
    setSortBy(parseSortParam(searchParams.get('sort')))
  }, [searchParams])

  // Sync active filter state back to URL cleanly without adding history clutter
  useEffect(() => {
    if (skipNextUrlWriteRef.current) {
      skipNextUrlWriteRef.current = false
      return
    }
    const nextQuery = buildShopQueryString({
      selectedCategory,
      searchQuery,
      selectedSize,
      selectedColor,
      minPrice,
      maxPrice,
      tryOnOnly,
      onSaleOnly,
      minDiscount,
      sortBy,
      selectedCollectionSlug,
    })

    if (nextQuery !== lastSyncedQueryRef.current) {
      lastSyncedQueryRef.current = nextQuery
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [
    selectedCategory,
    searchQuery,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    tryOnOnly,
    onSaleOnly,
    minDiscount,
    sortBy,
    selectedCollectionSlug,
    pathname,
    router,
  ])

  // Single Joined Data Load
  useEffect(() => {
    async function loadShopData() {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient()

        const [cats, joinedRes, cols] = await Promise.all([
          getCategories(supabase),
          supabase
            .from('products')
            .select('*, product_variants(*), categories(*)')
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),
          getCollections(supabase, { onlyActive: true }),
        ])

        setCategories(cats)
        if (cols && cols.length > 0) setCollections(cols)

        if (joinedRes.error || !joinedRes.data || joinedRes.data.length === 0) {
          const fallbackVMap: Record<string, ProductVariant[]> = {}
          DEFAULT_PRODUCT_VARIANTS.forEach((v) => {
            if (!fallbackVMap[v.product_id]) fallbackVMap[v.product_id] = []
            fallbackVMap[v.product_id]!.push(v)
          })
          setAllProducts(DEFAULT_PRODUCTS)
          setVariantsMap(fallbackVMap)
          const pMap: Record<string, ProductPricingSummary> = {}
          DEFAULT_PRODUCTS.forEach((p) => {
            pMap[p.id] = getEffectiveProductPricing(p, [])
          })
          setPricingMap(pMap)
          return
        }

        const vMap: Record<string, ProductVariant[]> = {}
        const prods: Product[] = (joinedRes.data as unknown as Array<{
          id: string
          title: string
          description: string | null
          price: number
          compare_at_price?: number | null
          stock: number
          image_url: string | null
          category_id: string | null
          category?: string | null
          material: string | null
          edition: string | null
          is_archived: boolean
          is_try_on_eligible?: boolean
          average_rating?: number
          review_count?: number
          created_at: string
          updated_at: string
          product_variants?: Array<ProductVariant & { is_archived?: boolean }>
          categories?: Category | null
        }>).map((row) => {
          vMap[row.id] = (row.product_variants || []).filter((v) => !v.is_archived)

          const categoryObj = row.categories
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            price: Number(row.price),
            compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
            stock: row.stock,
            image_url: row.image_url,
            category_id: row.category_id,
            category: row.category || categoryObj?.name || 'Apparel',
            material: row.material,
            edition: row.edition,
            is_archived: row.is_archived,
            is_try_on_eligible: row.is_try_on_eligible ?? true,
            average_rating: row.average_rating ?? 0,
            review_count: row.review_count ?? 0,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        })

        setAllProducts(prods)
        setVariantsMap(vMap)

        // Compute effective pricing across all products
        let activePromos: PromotionWithRules[] = []
        let serverPricingMap: Record<string, ProductPricingSummary> = {}
        try {
          const offersRes = await fetch('/api/offers')
          if (offersRes.ok) {
            const offersData = await offersRes.json()
            if (offersData.success) {
              if (offersData.pricingMap) {
                serverPricingMap = offersData.pricingMap
              }
              if (Array.isArray(offersData.campaigns)) {
                activePromos = offersData.campaigns
              }
            }
          }
        } catch {}

        const pMap: Record<string, ProductPricingSummary> = {}
        prods.forEach((p) => {
          pMap[p.id] = serverPricingMap[p.id] || getEffectiveProductPricing(p, activePromos)
        })
        setPricingMap(pMap)
      } finally {
        setIsLoading(false)
      }
    }
    loadShopData()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('shop_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadShopData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        loadShopData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storefront_config' }, () => {
        loadShopData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Resolve active collection / occasion
  const activeCollection = useMemo(() => {
    if (!selectedCollectionSlug) return null
    const target = selectedCollectionSlug.toLowerCase().trim()
    return (
      collections.find(
        (c) => c.slug.toLowerCase() === target || c.name.toLowerCase() === target
      ) || null
    )
  }, [selectedCollectionSlug, collections])

  // Resolve mapped category IDs (including all child subcategories) and fallback category names/slugs
  const { collectionCategoryIds, collectionCategoryNamesAndSlugs, collectionProductIds } = useMemo(() => {
    if (!activeCollection) {
      return {
        collectionCategoryIds: new Set<string>(),
        collectionCategoryNamesAndSlugs: new Set<string>(),
        collectionProductIds: new Set<string>(),
      }
    }

    const catIds = new Set<string>(activeCollection.category_ids || [])
    const namesAndSlugs = new Set<string>()

    categories.forEach((c) => {
      if (catIds.has(c.id)) {
        namesAndSlugs.add(c.name.toLowerCase())
        namesAndSlugs.add(c.slug.toLowerCase())
        // If it's a parent category, automatically include all its children!
        if (!c.parent_id) {
          categories.forEach((child) => {
            if (child.parent_id === c.id) {
              catIds.add(child.id)
              namesAndSlugs.add(child.name.toLowerCase())
              namesAndSlugs.add(child.slug.toLowerCase())
            }
          })
        }
      }
    })

    return {
      collectionCategoryIds: catIds,
      collectionCategoryNamesAndSlugs: namesAndSlugs,
      collectionProductIds: new Set<string>(activeCollection.product_ids || []),
    }
  }, [activeCollection, categories])

  // Filter application with full search query and collection support
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 0. Occasion / Collection Filter (Resolves category_id with fallback to category name/slug, plus pinned products)
      if (activeCollection) {
        const isPinned = collectionProductIds.has(product.id)
        const matchesCategoryId = Boolean(
          product.category_id && collectionCategoryIds.has(product.category_id)
        )
        const matchesCategoryNameOrSlug = Boolean(
          product.category && collectionCategoryNamesAndSlugs.has(product.category.toLowerCase())
        )
        const matchesCollection = isPinned || matchesCategoryId || matchesCategoryNameOrSlug
        if (!matchesCollection) return false
      }

      // 1. Text Search Filter (q param)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesQuery =
          product.title.toLowerCase().includes(q) ||
          (product.description || '').toLowerCase().includes(q) ||
          (product.material || '').toLowerCase().includes(q) ||
          (product.category || '').toLowerCase().includes(q) ||
          (product.edition || '').toLowerCase().includes(q)
        if (!matchesQuery) return false
      }

      // 2. Category Filter (Hierarchical: parent includes all child subcategories; child narrows to itself)
      if (selectedCategory !== 'All') {
        const sel = selectedCategory.toLowerCase()
        const catName = (product.category || '').toLowerCase()
        const matchCat = categories.find(
          (c) => c.slug.toLowerCase() === sel || c.name.toLowerCase() === sel
        )
        if (matchCat) {
          if (!matchCat.parent_id) {
            // It is a parent category: include parent ID AND all child subcategories!
            const matchedIds = new Set<string>([matchCat.id])
            const matchedNames = new Set<string>([matchCat.name.toLowerCase()])
            categories.forEach((c) => {
              if (c.parent_id === matchCat.id) {
                matchedIds.add(c.id)
                matchedNames.add(c.name.toLowerCase())
              }
            })
            const matchesCategory =
              (product.category_id && matchedIds.has(product.category_id)) ||
              matchedNames.has(catName)
            if (!matchesCategory) return false
          } else {
            // It is a specific subcategory: narrow to this child only!
            const matchesCategory =
              (product.category_id && product.category_id === matchCat.id) ||
              catName === matchCat.name.toLowerCase() ||
              catName === matchCat.slug.toLowerCase()
            if (!matchesCategory) return false
          }
        } else {
          if (catName !== sel) return false
        }
      }

      // 3. Bolt 45-Min Try-On Filter
      if (tryOnOnly && product.is_try_on_eligible === false) {
        return false
      }

      // 4. Size Filter
      if (selectedSize) {
        const variants = variantsMap[product.id] || []
        const hasSize = variants.some(
          (v) => v.size?.toLowerCase() === selectedSize.toLowerCase() && v.stock > 0
        )
        if (!hasSize) return false
      }

      // 5. Color Filter
      if (selectedColor) {
        const variants = variantsMap[product.id] || []
        const hasColor = variants.some(
          (v) => v.color?.toLowerCase() === selectedColor.toLowerCase()
        )
        const titleMatch = product.title.toLowerCase().includes(selectedColor.toLowerCase())
        if (!hasColor && !titleMatch) return false
      }

      // 6. Price Range Filter (against effective selling price)
      const sellingPrice = pricingMap[product.id]?.sellingPrice ?? Number(product.price)
      if (minPrice !== null && sellingPrice < minPrice) return false
      if (maxPrice !== null && sellingPrice > maxPrice) return false

      // 7. Discount & Sale Filters
      const pricing = pricingMap[product.id]
      const discountPct = pricing?.discountPercentage || 0
      if (onSaleOnly && discountPct <= 0) return false
      if (minDiscount !== null && discountPct < minDiscount) return false

      return true
    })
  }, [
    allProducts,
    activeCollection,
    collectionProductIds,
    collectionCategoryIds,
    collectionCategoryNamesAndSlugs,
    searchQuery,
    selectedCategory,
    tryOnOnly,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    categories,
    variantsMap,
    onSaleOnly,
    minDiscount,
    pricingMap,
  ])

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const priceA = pricingMap[a.id]?.sellingPrice ?? Number(a.price)
      const priceB = pricingMap[b.id]?.sellingPrice ?? Number(b.price)
      if (sortBy === 'price-asc') return priceA - priceB
      if (sortBy === 'price-desc') return priceB - priceA
      if (sortBy === 'discount-desc') {
        const discA = pricingMap[a.id]?.discountPercentage || 0
        const discB = pricingMap[b.id]?.discountPercentage || 0
        return discB - discA
      }
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })
  }, [filteredProducts, sortBy, pricingMap])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategory !== 'All') count++
    if (searchQuery.trim()) count++
    if (selectedSize) count++
    if (selectedColor) count++
    if (minPrice !== null || maxPrice !== null) count++
    if (tryOnOnly) count++
    if (minDiscount !== null) count++
    if (onSaleOnly) count++
    return count
  }, [selectedCategory, searchQuery, selectedSize, selectedColor, minPrice, maxPrice, tryOnOnly, minDiscount, onSaleOnly])

  const clearAllFilters = () => {
    setSelectedCategory('All')
    setSearchQuery('')
    setSelectedSize(null)
    setSelectedColor(null)
    setMinPrice(null)
    setMaxPrice(null)
    setTryOnOnly(false)
    setMinDiscount(null)
    setOnSaleOnly(false)
    setSortBy('recommended')
    setSelectedCollectionSlug(null)
  }

  const handleQuickAdd = (product: Product, size: string = 'M') => {
    const variants = variantsMap[product.id] || []
    const matchingVar = variants.find((v) => v.size === size && v.stock > 0) || variants[0]
    const pricing = pricingMap[product.id]
    const activePrice = pricing?.sellingPrice ?? (matchingVar?.price_override ?? product.price)
    const originalPrice = pricing?.mrp && pricing.mrp > activePrice ? pricing.mrp : undefined

    const added = addItem({
      id: matchingVar ? `${product.id}-${matchingVar.id}` : `${product.id}-${size}`,
      productId: product.id,
      title: product.title,
      category: product.category || 'Atelier Collection',
      edition: product.edition || '100% Cotton',
      price: activePrice,
      originalPrice,
      quantity: 1,
      image: product.image_url || '/images/prod1-primary.jpg',
      size: size || matchingVar?.size || 'M',
    })

    if (added) {
      useCartStore.getState().openDrawer()
    } else {
      setToastMessage('Bolt limit: maximum 5 garments per fitting session.')
      setTimeout(() => setToastMessage(null), 3500)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#14293a] font-sans pb-24 selection:bg-[#b91c1c] selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#14293a] text-white px-5 py-3 rounded-sm shadow-xl text-xs font-sans font-semibold flex items-center gap-2 border border-white/20">
          <Check className="w-4 h-4 text-[#b91c1c]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. COMPACT PAGE HEADER & BREADCRUMBS                      */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <Link href="/shop" className="hover:text-[#14293a] transition-colors">Shop</Link>
          {activeCollection && (
            <>
              <span> / </span>
              <span className="text-[#14293a] font-medium">Occasion: {activeCollection.name}</span>
            </>
          )}
          {selectedCategory !== 'All' && (
            <>
              <span> / </span>
              <span className="text-[#14293a]">{selectedCategory}</span>
            </>
          )}
          {searchQuery && (
            <>
              <span> / </span>
              <span className="text-[#14293a]">Search: &ldquo;{searchQuery}&rdquo;</span>
            </>
          )}
        </nav>

        {/* Active Occasion / Collection Banner */}
        {activeCollection && (
          <div className="mb-4 p-4 sm:p-5 bg-[#fbfbfb] border border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#14293a] text-white">
                  {activeCollection.group_type}
                </span>
                <span className="text-xs text-[#6c7079] font-medium">
                  Curated Collection
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#14293a]">
                {activeCollection.name}
              </h2>
              {activeCollection.description && (
                <p className="text-xs text-[#6c7079] mt-1 max-w-2xl leading-relaxed">
                  {activeCollection.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedCollectionSlug(null)
                const params = new URLSearchParams(searchParams.toString())
                params.delete('collection')
                const queryStr = params.toString()
                router.push(`/shop${queryStr ? `?${queryStr}` : ''}`)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#f0f0f0] border border-[#d3d6db] text-[#14293a] transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-[#b91c1c]" />
              <span>Clear Occasion</span>
            </button>
          </div>
        )}

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          {/* Left side */}
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight flex items-baseline">
              {searchQuery ? `Search: "${searchQuery}"` : selectedCategory === 'All' ? 'All Products' : selectedCategory}
              <span className="text-sm font-normal text-[#6c7079] ml-2">
                ({sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'})
              </span>
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Standard Pan-India Delivery</span>
              <span>·</span>
              <span>45-min doorstep try-on available</span>
            </div>
          </div>

          {/* Right side: Filter & Sort Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3 py-1.5 bg-white border border-[#d3d6db] text-xs font-medium text-[#14293a] flex items-center gap-1.5 rounded-sm shadow-xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#14293a]" />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            </button>

            <button
              onClick={() => setShowSidebar((prev) => !prev)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#d3d6db] text-xs font-medium text-[#14293a] hover:bg-[#f8f8f8] rounded-sm transition-colors shadow-xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#14293a]" />
              <span>{showSidebar ? 'Hide Filters' : 'Show Filters'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="shop-sort" className="text-[#6c7079] font-medium hidden sm:inline">
                Sort by:
              </label>
              <select
                id="shop-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-[#d3d6db] px-3 py-1.5 text-xs text-[#14293a] focus:outline-none focus:border-[#14293a] rounded-sm cursor-pointer shadow-xs font-sans"
              >
                <option value="recommended">Recommended</option>
                <option value="discount-desc">Discount: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
            <span className="text-[#6c7079] font-semibold text-[11px] uppercase tracking-wider">
              Filters:
            </span>
            {tryOnOnly && (
              <span className="inline-flex items-center gap-1.5 bg-[#14293a] text-white px-2.5 py-1 rounded-sm text-xs font-medium">
                <Zap className="w-3 h-3 text-white" strokeWidth={1.75} />
                <span>Bolt Try-On</span>
                <button
                  type="button"
                  aria-label="Remove Bolt Try-On filter"
                  onClick={() => setTryOnOnly(false)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-sm text-xs font-semibold text-[#b91c1c]">
                <span>On Sale</span>
                <button
                  type="button"
                  aria-label="Remove On Sale filter"
                  onClick={() => setOnSaleOnly(false)}
                  className="text-[#b91c1c] hover:text-[#14293a] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {minDiscount !== null && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Min. {minDiscount}% Off</span>
                <button
                  type="button"
                  aria-label="Remove discount filter"
                  onClick={() => setMinDiscount(null)}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>{selectedCategory}</span>
                <button
                  type="button"
                  aria-label="Remove category filter"
                  onClick={() => setSelectedCategory('All')}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  aria-label="Remove search filter"
                  onClick={() => setSearchQuery('')}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {selectedSize && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Size: {selectedSize}</span>
                <button
                  type="button"
                  aria-label="Remove size filter"
                  onClick={() => setSelectedSize(null)}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {selectedColor && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>Color: {selectedColor}</span>
                <button
                  type="button"
                  aria-label="Remove color filter"
                  onClick={() => setSelectedColor(null)}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {formatPriceRangeLabel(minPrice, maxPrice) && (
              <span className="inline-flex items-center gap-1.5 bg-[#f8f8f8] border border-[#d3d6db] px-2.5 py-1 rounded-sm text-xs font-medium text-[#14293a]">
                <span>{formatPriceRangeLabel(minPrice, maxPrice)}</span>
                <button
                  type="button"
                  aria-label="Remove price filter"
                  onClick={() => {
                    setMinPrice(null)
                    setMaxPrice(null)
                  }}
                  className="text-[#6c7079] hover:text-[#b91c1c] cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs text-[#b91c1c] hover:text-[#14293a] font-semibold ml-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN CATALOG LAYOUT: LEFT SIDEBAR + 4-COL GRID        */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-start gap-8">
          {/* DESKTOP FILTER SIDEBAR */}
          <aside className={`${showSidebar ? 'hidden lg:block' : 'hidden'} w-64 shrink-0 bg-white border border-[#e5e7eb] p-5 rounded-sm sticky top-28 self-start`}>
            <ShopFilterPanel
              categories={categories}
              categoryProductCounts={categoryProductCounts}
              totalProductCount={allProducts.length}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              availableSizes={availableSizes}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
              availableColors={availableColors}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onPriceRangeChange={(min, max) => {
                setMinPrice(min)
                setMaxPrice(max)
              }}
              tryOnOnly={tryOnOnly}
              onToggleTryOn={() => setTryOnOnly((prev) => !prev)}
              boltEligibleCount={boltEligibleCount}
              onSaleOnly={onSaleOnly}
              onToggleOnSale={() => setOnSaleOnly((prev) => !prev)}
              onSaleCount={onSaleCount}
              minDiscount={minDiscount}
              onSelectMinDiscount={setMinDiscount}
              activeFilterCount={activeFilterCount}
              onClearAll={clearAllFilters}
              variant="desktop"
            />
          </aside>

          {/* ========================================================= */}
          {/* PRODUCT GRID (3-Col when Sidebar Open, 4-Col Fullwidth)   */}
          {/* ========================================================= */}
          <main className="flex-1 min-w-0">
            {/* Cascading Subcategory Filter Pills (zero-count subcategories hidden) */}
            {activeParentCategory && (() => {
              const visibleSubs = (subcategoriesMap[activeParentCategory.id] || []).filter(
                (sub) =>
                  (categoryProductCounts[sub.name] || 0) > 0 ||
                  selectedCategory.toLowerCase() === sub.name.toLowerCase() ||
                  selectedCategory.toLowerCase() === sub.slug.toLowerCase()
              )
              if (visibleSubs.length === 0) return null
              return (
                <div className="mb-6 pb-3 border-b border-[#e5e7eb] flex items-center gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(activeParentCategory.name)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-sans whitespace-nowrap transition-colors cursor-pointer border ${
                      selectedCategory.toLowerCase() === activeParentCategory.name.toLowerCase() ||
                      selectedCategory.toLowerCase() === activeParentCategory.slug.toLowerCase()
                        ? 'bg-[#14293a] text-white border-[#14293a] font-semibold'
                        : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a] font-medium'
                    }`}
                  >
                    All {activeParentCategory.name}
                  </button>
                  {visibleSubs.map((sub) => {
                    const isSubSelected =
                      selectedCategory.toLowerCase() === sub.name.toLowerCase() ||
                      selectedCategory.toLowerCase() === sub.slug.toLowerCase()

                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => setSelectedCategory(sub.name)}
                        className={`px-3 py-1.5 rounded-sm text-xs font-sans whitespace-nowrap transition-colors cursor-pointer border ${
                          isSubSelected
                            ? 'bg-[#14293a] text-white border-[#14293a] font-semibold'
                            : 'bg-white text-[#14293a] border-[#d3d6db] hover:border-[#14293a] font-medium'
                        }`}
                      >
                        {sub.name}
                      </button>
                    )
                  })}
                </div>
              )
            })()}

            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#6c7079] uppercase tracking-wider font-semibold">
                  Loading collections...
                </p>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#d3d6db] p-8 rounded-sm bg-[#f8f8f8] space-y-4">
                <p className="text-sm font-semibold text-[#14293a]">
                  No silhouettes found matching the selected filters.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#14293a] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-2 md:grid-cols-2 ${showSidebar ? 'lg:grid-cols-3 2xl:grid-cols-4' : 'lg:grid-cols-4'} gap-4 sm:gap-6`}>
                {sortedProducts.map((prod, idx) => {
                  const pricing = pricingMap[prod.id]
                  return (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      variants={variantsMap[prod.id]}
                      pricing={pricing}
                      mrp={pricing?.mrp}
                      sellingPrice={pricing?.sellingPrice}
                      discountPercentage={pricing?.discountPercentage}
                      bestCouponCode={pricing?.bestCoupon?.code}
                      bestCouponPrice={pricing?.bestCouponPrice}
                      priority={idx < 4}
                      showTryOnBadge={tryOnOnly ? true : undefined}
                      onQuickAdd={(p, sz) => handleQuickAdd(p, sz)}
                    />
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE FILTER DRAWER (Bottom Sheet / Slide-Over)          */}
      {/* ========================================================= */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden flex items-end sm:items-stretch sm:justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
        >
          <div className="w-full sm:max-w-sm max-h-[90dvh] sm:h-full sm:max-h-full bg-white flex flex-col border-t sm:border-t-0 sm:border-l border-[#d3d6db] rounded-t-sm sm:rounded-none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb] shrink-0">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[11px] font-semibold uppercase tracking-wider text-[#b91c1c] hover:underline"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 text-[#6c7079] hover:text-[#14293a]"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              <ShopFilterPanel
                categories={categories}
                categoryProductCounts={categoryProductCounts}
                totalProductCount={allProducts.length}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                availableSizes={availableSizes}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                availableColors={availableColors}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onPriceRangeChange={(min, max) => {
                  setMinPrice(min)
                  setMaxPrice(max)
                }}
                tryOnOnly={tryOnOnly}
                onToggleTryOn={() => setTryOnOnly((prev) => !prev)}
                boltEligibleCount={boltEligibleCount}
                onSaleOnly={onSaleOnly}
                onToggleOnSale={() => setOnSaleOnly((prev) => !prev)}
                onSaleCount={onSaleCount}
                minDiscount={minDiscount}
                onSelectMinDiscount={setMinDiscount}
                activeFilterCount={activeFilterCount}
                onClearAll={clearAllFilters}
                variant="mobile"
              />
            </div>

            <div className="p-4 border-t border-[#e5e7eb] bg-white shrink-0">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-[#14293a] text-white font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#b91c1c] transition-colors"
              >
                Show {sortedProducts.length} {sortedProducts.length === 1 ? 'Result' : 'Results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-[#14293a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#d3d6db] border-t-[#b91c1c] rounded-full animate-spin" />
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  )
}
