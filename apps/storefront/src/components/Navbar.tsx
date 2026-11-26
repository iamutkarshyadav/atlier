'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ShoppingBag,
  X,
  ArrowRight,
  LogOut,
  Package,
  Zap,
  ChevronDown,
  User,
  Menu,
  MapPin,
  Heart,
  Tag,
  Lock,
} from 'lucide-react'
import { useHydratedCart } from '../store/useCartStore'
import { useHydratedBolt } from '../store/useBoltStore'
import { useHydratedWishlist, useWishlistStore } from '../store/useWishlistStore'
import { PincodeModal } from './PincodeModal'
import { SearchModal } from './SearchModal'
import { ProductImage } from './ui/ProductImage'
import { createBrowserClient } from '@repo/supabase/browser'
import {
  getCategories,
  getCollections,
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  type Category,
  type Product,
  type CollectionWithRelations,
} from '@repo/supabase/utils'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Account'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

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

export interface NavbarProps {
  initialCategories?: Category[]
  announcement?: {
    is_active?: boolean
    badge?: string
    message?: string
    link_text?: string
    link_url?: string | null
  }
}

export function Navbar({ initialCategories = DEFAULT_CATEGORIES, announcement }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [occasions, setOccasions] = useState<CollectionWithRelations[]>([])
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false)
  const [latestProducts, setLatestProducts] = useState<Product[]>(DEFAULT_PRODUCTS.slice(0, 4))
  const [announcementIndex, setAnnouncementIndex] = useState(0)

  const isBoltPage = pathname?.startsWith('/bolt')

  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const categoryNavRef = useRef<HTMLElement>(null)

  const { itemCount, openDrawer } = useHydratedCart()
  const { city: boltCity, pincode } = useHydratedBolt()
  const { itemCount: wishlistCount } = useHydratedWishlist()
  const clearWishlist = useWishlistStore((s) => s.clearWishlist)
  const syncGuestWishlist = useWishlistStore((s) => s.syncGuestWishlist)

  // Global keyboard shortcut for search modal: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Re-fetch categories and occasions on mount and subscribe to real-time changes
  useEffect(() => {
    const supabase = createBrowserClient()
    const fetchNavData = async () => {
      try {
        const [catRes, colRes] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/collections?showInNavbar=true', { cache: 'no-store' }),
        ])
        const [catJson, colJson] = await Promise.all([catRes.json(), colRes.json()])
        if (catJson.success && Array.isArray(catJson.categories) && catJson.categories.length > 0) {
          setCategories(catJson.categories)
        }
        if (colJson.success && Array.isArray(colJson.collections)) {
          setOccasions(colJson.collections)
          return
        }
      } catch {}

      Promise.all([
        getCategories(supabase),
        getCollections(supabase, { onlyActive: true, showInNavbar: true }),
      ])
        .then(([cats, cols]) => {
          if (Array.isArray(cats) && cats.length > 0) setCategories(cats)
          if (Array.isArray(cols)) setOccasions(cols)
        })
        .catch(() => {})
    }

    fetchNavData()

    const channel = supabase
      .channel('navbar_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        fetchNavData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchNavData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storefront_config' }, () => {
        fetchNavData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch latest 4 products from Supabase for New Arrivals full-width mega-menu preview
  useEffect(() => {
    async function loadLatestProducts() {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(4)

        if (data && data.length > 0) {
          setLatestProducts(
            data.map((row: any) => ({
              id: row.id,
              title: row.title,
              description: row.description,
              price: Number(row.price),
              compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
              stock: row.stock,
              image_url: row.image_url,
              category_id: row.category_id,
              category: row.category || 'Apparel',
              material: row.material,
              edition: row.edition,
              is_archived: row.is_archived,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }))
          )
        }
      } catch {
        // Fallback already populated via DEFAULT_PRODUCTS
      }
    }
    loadLatestProducts()
  }, [])

  // Dynamic highest-priority offer for rotating single announcement bar
  const [dynamicOffer, setDynamicOffer] = useState<{
    text: string
    href: string
  } | null>(null)
  const hasFetchedOffersRef = useRef(false)

  useEffect(() => {
    if (hasFetchedOffersRef.current) return
    hasFetchedOffersRef.current = true

    async function loadOffers() {
      try {
        const res = await fetch('/api/offers')
        if (!res.ok) return
        const data = await res.json()
        if (data.success && data.featuredOffer) {
          const fo = data.featuredOffer
          const firstCoupon = fo.publicCoupons?.[0]?.code
          const badge =
            fo.discountType === 'percentage'
              ? `${Math.round(fo.discountValue)}% Off`
              : fo.discountType === 'free_shipping'
                ? 'Free Express Shipping'
                : `₹${Math.round(fo.discountValue)} Off`
          setDynamicOffer({
            text: firstCoupon
              ? `${badge} on ${fo.name} · Code ${firstCoupon}`
              : `${badge} · ${fo.name}`,
            href: '/offers',
          })
        }
      } catch {}
    }
    loadOffers()
  }, [])

  // Build single clean rotating announcement messages (zero Unicode emojis)
  const announcementSlides = useMemo(() => {
    const primaryMsg =
      announcement?.message ||
      'Try up to 5 pieces at home in 45 mins · Free Express Delivery above ₹1,999'

    const slides: Array<{ icon: 'zap' | 'tag'; text: string; href: string }> = [
      {
        icon: 'zap',
        text: primaryMsg,
        href: announcement?.link_url || '/bolt',
      },
    ]

    if (dynamicOffer) {
      slides.push({
        icon: 'tag',
        text: dynamicOffer.text,
        href: dynamicOffer.href,
      })
    }

    return slides
  }, [announcement, dynamicOffer])

  useEffect(() => {
    if (announcementSlides.length <= 1) return
    const timer = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcementSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [announcementSlides.length])

  // Build memoized category tree & cap top-level desktop category links to keep total <= 6-7 links
  const { parentCategories, visibleDesktopCategories, overflowDesktopCategories, subcategoriesMap } =
    useMemo(() => {
      const parents = categories
        .filter((c) => !c.parent_id)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      // Fixed links: New Arrivals, (Occasions if present), Offers => 2 or 3 links.
      // Cap total desktop links to 6-7 so nothing clips horizontally.
      const maxParentSlots = occasions.length > 0 ? 4 : 5
      const visible = parents.slice(0, maxParentSlots)
      const overflow = parents.slice(maxParentSlots)

      const subMap: Record<string, Category[]> = {}
      categories.forEach((c) => {
        if (c.parent_id) {
          if (!subMap[c.parent_id]) subMap[c.parent_id] = []
          subMap[c.parent_id]!.push(c)
        }
      })
      Object.keys(subMap).forEach((pId) => {
        subMap[pId]!.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      })

      return {
        parentCategories: parents,
        visibleDesktopCategories: visible,
        overflowDesktopCategories: overflow,
        subcategoriesMap: subMap,
      }
    }, [categories, occasions.length])

  // Close mobile menu and mega-menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
    setActiveMegaMenu(null)
    setUserDropdownOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Click outside & Escape listener for dropdowns and category popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (categoryNavRef.current && !categoryNavRef.current.contains(e.target as Node)) {
        setActiveMegaMenu(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMegaMenu(null)
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Resolve user session from Supabase
  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveUserProfile(authUser: any) {
      if (!authUser) {
        setUserEmail(null)
        setUserName(null)
        return
      }

      syncGuestWishlist()
      setUserEmail(authUser.email || null)

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profile?.name && profile.name.trim() !== '') {
          setUserName(profile.name.trim())
          return
        }
      } catch {}

      const metaName = authUser.user_metadata?.name || authUser.user_metadata?.full_name
      if (metaName && typeof metaName === 'string' && metaName.trim() !== '') {
        setUserName(metaName.trim())
        return
      }

      if (authUser.email) {
        setUserName(formatNameFromEmail(authUser.email))
        return
      }

      setUserName('Patron')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveUserProfile(session.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUserProfile(session?.user ?? null)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [syncGuestWishlist])

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      clearWishlist()
      setUserEmail(null)
      setUserName(null)
      setUserDropdownOpen(false)
      router.refresh()
    } catch {}
  }

  const handleMouseEnterMenu = (title: string) => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current)
    }
    setActiveMegaMenu(title)
  }

  const handleMouseLeaveMenu = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null)
    }, 180)
  }

  const currentAnnouncement = announcementSlides[announcementIndex % announcementSlides.length]!
  const activeCategoryParent = parentCategories.find((c) => c.id === activeMegaMenu)
  const activeCategoryChildren = activeCategoryParent
    ? subcategoriesMap[activeCategoryParent.id] || []
    : []

  if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
    return null
  }

  if (pathname?.startsWith('/checkout')) {
    return (
      <header className="sticky top-0 z-50 w-full h-16 bg-white text-[#14293a] border-b border-[#d3d6db]">
        <div className="max-w-[1320px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link href="/" className="group shrink-0">
            <span className="font-sans text-xl sm:text-2xl font-black tracking-tight text-[#14293a] group-hover:text-[#b91c1c] transition-colors leading-none block">
              MAISON TG
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#14293a]">
            <Lock className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
            <span>Secure Checkout</span>
          </div>

          <Link
            href="/cart"
            className="text-xs font-semibold text-[#6c7079] hover:text-[#14293a] underline underline-offset-4 transition-colors shrink-0"
          >
            Back to Bag
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full max-w-full bg-white text-[#14293a] shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border-b border-[#d3d6db] overflow-x-clip">
      {/* ========================================================= */}
      {/* TIER 1: CLEAN SINGLE-MESSAGE ROTATING ANNOUNCEMENT BAR     */}
      {/* ========================================================= */}
      {announcement?.is_active !== false && (
        <div className="bg-[#f8f8f8] border-b border-[#e5e7eb] h-8 px-4 flex items-center justify-center text-xs font-sans font-medium text-[#14293a]">
          <Link
            href={currentAnnouncement.href}
            className="inline-flex items-center gap-1.5 hover:text-[#b91c1c] transition-colors truncate max-w-full"
          >
            {currentAnnouncement.icon === 'zap' ? (
              <Zap className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
            ) : (
              <Tag className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
            )}
            <span className="truncate">{currentAnnouncement.text}</span>
          </Link>
        </div>
      )}

      {/* ========================================================= */}
      {/* TIER 2: PRIMARY HEADER (LOGO, SEARCH + PIN, ACTIONS)      */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Mobile Hamburger & Clean Brand Mark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 -ml-1.5 text-[#14293a] hover:bg-[#f1f1f1] rounded-sm transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" strokeWidth={1.75} />
          </button>

          <Link href="/" className="group">
            <span className="font-sans text-2xl sm:text-[26px] font-black tracking-tight text-[#14293a] group-hover:text-[#b91c1c] transition-colors leading-none block">
              MAISON TG
            </span>
          </Link>
        </div>

        {/* Center: Predictive Search Bar + Compact Delivery Pincode Trigger */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="flex-1 flex items-center bg-[#f8f8f8] hover:bg-white border border-[#d3d6db] hover:border-[#14293a] rounded-sm px-3.5 py-2 text-xs text-[#6c7079] hover:text-[#14293a] transition-colors group cursor-pointer text-left min-w-0"
            aria-label="Search products"
          >
            <Search
              className="w-4 h-4 text-[#6c7079] group-hover:text-[#14293a] mr-2.5 shrink-0 transition-colors"
              strokeWidth={1.75}
            />
            <span className="font-sans text-xs text-[#8a909a] group-hover:text-[#6c7079] truncate">
              Search hoodies, kurta sets, jackets, denim...
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPincodeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#d3d6db] hover:border-[#14293a] rounded-sm text-xs text-[#14293a] transition-colors cursor-pointer shrink-0"
            title="Select delivery PIN code"
          >
            <MapPin className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" strokeWidth={1.75} />
            <span className="font-medium whitespace-nowrap">
              {pincode ? `${pincode}${boltCity ? ` (${boltCity})` : ''}` : 'Deliver to'}
            </span>
          </button>
        </div>

        {/* Right Utility Group (Bolt Pill, Account, Wishlist, Cart) */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile search trigger button */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="md:hidden p-2 text-[#14293a] hover:bg-[#f1f1f1] rounded-sm transition-colors cursor-pointer"
            aria-label="Search products"
          >
            <Search className="w-5 h-5 text-[#14293a]" strokeWidth={1.75} />
          </button>

          {/* Bolt Try-On Service Pill */}
          <Link
            href="/bolt"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
              isBoltPage
                ? 'bg-[#14293a] text-white border-[#14293a]'
                : 'border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Bolt Try-On</span>
          </Link>

          {/* Account dropdown */}
          <div className="relative" ref={userDropdownRef}>
            {userEmail ? (
              <div>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-sans font-medium text-[#14293a] hover:text-[#b91c1c] transition-colors py-1 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
                  <span className="hidden lg:inline max-w-[110px] truncate">{userName || 'Account'}</span>
                  <ChevronDown className="w-3 h-3 text-[#6c7079]" strokeWidth={1.75} />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 mt-2 w-52 bg-white border border-[#d3d6db] shadow-lg rounded-sm py-2 z-50 text-xs font-sans"
                    >
                      <div className="px-4 py-2 border-b border-[#e5e7eb]">
                        <p className="font-semibold text-[#14293a] truncate">{userName || 'Account'}</p>
                        <p className="text-[11px] text-[#6c7079] truncate">{userEmail}</p>
                      </div>
                      <Link
                        href="/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-[#14293a] hover:bg-[#f8f8f8] transition-colors"
                      >
                        <Package className="w-3.5 h-3.5 text-[#6c7079]" strokeWidth={1.75} />
                        <span>My Orders</span>
                      </Link>
                      <Link
                        href="/wishlist"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-[#14293a] hover:bg-[#f8f8f8] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-[#6c7079]" strokeWidth={1.75} />
                          <span>My Wishlist</span>
                        </div>
                        {wishlistCount > 0 && (
                          <span className="text-[10px] font-bold bg-[#f1f1f1] text-[#14293a] px-1.5 py-0.5 rounded-full">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setIsPincodeModalOpen(true)
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 text-[#14293a] hover:bg-[#f8f8f8] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#6c7079] shrink-0" strokeWidth={1.75} />
                          <span className="truncate">
                            {pincode ? `PIN: ${pincode}` : 'Delivery Pincode'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#14293a] font-bold underline ml-1 shrink-0">
                          {pincode ? 'Change' : 'Set'}
                        </span>
                      </button>
                      <div className="border-t border-[#e5e7eb] my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-[#b91c1c] hover:bg-[#fef2f2] transition-colors cursor-pointer font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-sans font-semibold text-[#14293a] hover:text-[#b91c1c] transition-colors py-1"
              >
                <User className="w-4 h-4 text-[#6c7079]" strokeWidth={1.75} />
                <span className="hidden lg:inline">Sign In</span>
              </Link>
            )}
          </div>

          {/* Wishlist Icon & Badge */}
          <Link
            href="/wishlist"
            className="flex items-center gap-1 text-[#14293a] hover:text-[#b91c1c] transition-colors py-1 relative"
            aria-label="Wishlist"
          >
            <div className="relative">
              <Heart className="w-5 h-5" strokeWidth={1.75} />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#b91c1c] text-white font-sans text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="hidden xl:inline font-sans text-xs font-semibold ml-1">Wishlist</span>
          </Link>

          {/* Cart Drawer Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className="flex items-center gap-1 text-[#14293a] hover:text-[#b91c1c] transition-colors py-1 relative cursor-pointer"
            aria-label="Open Shopping Bag"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#b91c1c] text-white font-sans text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="hidden xl:inline font-sans text-xs font-semibold ml-1">Bag</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TIER 3: CAPPED 6–7 ITEM TITLE CASE NAV + UNIFIED MEGA-MENU*/}
      {/* ========================================================= */}
      <nav
        ref={categoryNavRef}
        className="hidden lg:block border-t border-[#e5e7eb] bg-white relative w-full"
        onMouseLeave={handleMouseLeaveMenu}
      >
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center justify-start gap-6 xl:gap-8 select-none">
            {/* 1. New Arrivals */}
            <li onMouseEnter={() => handleMouseEnterMenu('new-arrivals')} className="shrink-0">
              <button
                type="button"
                onClick={() =>
                  setActiveMegaMenu((prev) => (prev === 'new-arrivals' ? null : 'new-arrivals'))
                }
                className={`inline-flex items-center gap-1.5 py-3 text-[13px] font-sans font-semibold tracking-wide whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                  activeMegaMenu === 'new-arrivals'
                    ? 'text-[#b91c1c] border-[#b91c1c]'
                    : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                }`}
                aria-expanded={activeMegaMenu === 'new-arrivals'}
                aria-haspopup="true"
              >
                <span>New Arrivals</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#6c7079] transition-transform duration-200 ${
                    activeMegaMenu === 'new-arrivals' ? 'rotate-180 text-[#b91c1c]' : ''
                  }`}
                  strokeWidth={1.75}
                />
              </button>
            </li>

            {/* 2. Occasions */}
            {occasions.length > 0 && (
              <li onMouseEnter={() => handleMouseEnterMenu('occasions')} className="shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMegaMenu((prev) => (prev === 'occasions' ? null : 'occasions'))
                  }
                  className={`inline-flex items-center gap-1.5 py-3 text-[13px] font-sans font-semibold tracking-wide whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                    activeMegaMenu === 'occasions'
                      ? 'text-[#b91c1c] border-[#b91c1c]'
                      : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                  }`}
                  aria-expanded={activeMegaMenu === 'occasions'}
                  aria-haspopup="true"
                >
                  <span>Occasions</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#6c7079] transition-transform duration-200 ${
                      activeMegaMenu === 'occasions' ? 'rotate-180 text-[#b91c1c]' : ''
                    }`}
                    strokeWidth={1.75}
                  />
                </button>
              </li>
            )}

            {/* 3. Offers */}
            <li onMouseEnter={() => setActiveMegaMenu(null)} className="shrink-0">
              <Link
                href="/offers"
                className={`inline-flex items-center gap-1.5 py-3 text-[13px] font-sans font-semibold tracking-wide whitespace-nowrap transition-colors border-b-2 ${
                  pathname === '/offers'
                    ? 'text-[#b91c1c] border-[#b91c1c]'
                    : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                }`}
              >
                <span>Offers</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] rounded-sm leading-none">
                  Sale
                </span>
              </Link>
            </li>

            {/* 4..7. Top Parent Categories (Title Case, Capped) */}
            {visibleDesktopCategories.map((cat) => {
              const children = subcategoriesMap[cat.id] || []
              const hasChildren = children.length > 0
              const isActive = activeMegaMenu === cat.id

              return (
                <li
                  key={cat.id}
                  onMouseEnter={() => {
                    if (hasChildren) {
                      handleMouseEnterMenu(cat.id)
                    } else {
                      setActiveMegaMenu(null)
                    }
                  }}
                  className="shrink-0"
                >
                  <Link
                    href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                    className={`inline-flex items-center gap-1 py-3 text-[13px] font-sans font-semibold tracking-wide whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? 'text-[#b91c1c] border-[#b91c1c]'
                        : 'text-[#14293a] border-transparent hover:text-[#b91c1c] hover:border-[#b91c1c]'
                    }`}
                  >
                    <span>{toTitleCase(cat.name)}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#6c7079] transition-transform duration-200 ${
                          isActive ? 'rotate-180 text-[#b91c1c]' : ''
                        }`}
                        strokeWidth={1.75}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ========================================================= */}
        {/* UNIFIED FULL-WIDTH MEGA-MENU ARCHITECTURE                 */}
        {/* ========================================================= */}
        <div
          className={`absolute left-0 right-0 top-full bg-white border-t border-b border-[#d3d6db] shadow-xl z-40 transition-all duration-150 ease-out ${
            activeMegaMenu === 'new-arrivals' ||
            (activeMegaMenu === 'occasions' && occasions.length > 0) ||
            Boolean(activeCategoryParent && activeCategoryChildren.length > 0)
              ? 'opacity-100 translate-y-0 pointer-events-auto visible'
              : 'opacity-0 translate-y-1 pointer-events-none invisible'
          }`}
          onMouseEnter={() => {
            if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current)
          }}
          onMouseLeave={handleMouseLeaveMenu}
        >
          {/* Mega-Menu Variant A: New Arrivals */}
          {activeMegaMenu === 'new-arrivals' && (
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-3 space-y-5 border-r border-[#e5e7eb] pr-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079] block mb-2.5">
                      New Releases
                    </span>
                    <div className="space-y-2">
                      <Link
                        href="/shop?sort=newest"
                        onClick={() => setActiveMegaMenu(null)}
                        className="flex items-center justify-between p-2.5 rounded-sm bg-[#f8f8f8] hover:bg-[#14293a] text-[#14293a] hover:text-white transition-colors group font-semibold text-xs"
                      >
                        <span>View All New In</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </Link>
                      <Link
                        href="/bolt"
                        onClick={() => setActiveMegaMenu(null)}
                        className="flex items-center justify-between p-2.5 rounded-sm border border-[#fecaca] bg-[#fef2f2] hover:bg-[#b91c1c] text-[#b91c1c] hover:text-white transition-colors font-semibold text-xs"
                      >
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Bolt Try-On Drops</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase">45m</span>
                      </Link>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#e5e7eb]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c7079] block mb-2">
                      Categories
                    </span>
                    <ul className="space-y-1">
                      {parentCategories.map((cat) => (
                        <li key={cat.id}>
                          <Link
                            href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}&sort=newest`}
                            onClick={() => setActiveMegaMenu(null)}
                            className="flex items-center justify-between py-1 text-xs font-medium text-[#14293a] hover:text-[#b91c1c] transition-colors"
                          >
                            <span className="truncate">{toTitleCase(cat.name)}</span>
                            <ArrowRight className="w-3 h-3 text-[#8a909a]" strokeWidth={1.75} />
                          </Link>
                        </li>
                      ))}
                      {overflowDesktopCategories.length === 0 && (
                        <li>
                          <Link
                            href="/shop"
                            onClick={() => setActiveMegaMenu(null)}
                            className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-[#b91c1c] hover:underline"
                          >
                            <span>Shop All Collections</span>
                            <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="col-span-9">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e5e7eb]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#14293a]">
                      Just Dropped
                    </span>
                    <Link
                      href="/shop?sort=newest"
                      onClick={() => setActiveMegaMenu(null)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#b91c1c] hover:underline"
                    >
                      <span>Explore All New Arrivals</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {latestProducts.slice(0, 4).map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        onClick={() => setActiveMegaMenu(null)}
                        className="group block border border-[#e5e7eb] hover:border-[#14293a] rounded-sm p-2 bg-[#f8f8f8]/60 hover:bg-white transition-colors"
                      >
                        <div className="relative aspect-[3/4] bg-[#f5f5f4] rounded-sm overflow-hidden mb-2">
                          <ProductImage
                            src={product.image_url}
                            alt={product.title}
                            fill
                            sizes="220px"
                            className="group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 bg-[#14293a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide uppercase">
                            New
                          </span>
                        </div>
                        <h4 className="text-xs font-medium text-neutral-900 group-hover:text-[#b91c1c] transition-colors truncate">
                          {product.title}
                        </h4>
                        <p className="text-xs font-bold text-neutral-950 mt-0.5 tabular-nums">
                          ₹{Math.round(product.price).toLocaleString('en-IN')}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mega-Menu Variant B: Occasions */}
          {activeMegaMenu === 'occasions' && occasions.length > 0 && (
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#e5e7eb]">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-[#14293a]">
                    Shop by Occasion
                  </h3>
                  <p className="text-xs text-[#6c7079] mt-0.5">
                    Curated edits tailored for weddings, celebrations, resort travel, and daily tailoring.
                  </p>
                </div>
                <Link
                  href="/shop"
                  onClick={() => setActiveMegaMenu(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b91c1c] hover:underline"
                >
                  <span>Explore All Curations</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {occasions.slice(0, 4).map((occ) => (
                  <Link
                    key={occ.id}
                    href={`/shop?collection=${encodeURIComponent(occ.slug)}`}
                    onClick={() => setActiveMegaMenu(null)}
                    className="group flex flex-col bg-[#f8f8f8] border border-[#e5e7eb] hover:border-[#14293a] rounded-sm transition-colors overflow-hidden"
                  >
                    <div className="relative aspect-[3/4] bg-[#f5f5f4] overflow-hidden">
                      <ProductImage
                        src={occ.image_url}
                        alt={occ.name}
                        fill
                        unoptimized
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#14293a] group-hover:text-[#b91c1c] transition-colors truncate">
                        {toTitleCase(occ.name)}
                      </h4>
                      <ArrowRight
                        className="w-3.5 h-3.5 text-[#6c7079] group-hover:text-[#b91c1c] group-hover:translate-x-0.5 transition-all shrink-0"
                        strokeWidth={1.75}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mega-Menu Variant C: Parent Category & Subcategories */}
          {activeCategoryParent && activeCategoryChildren.length > 0 && (
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#e5e7eb]">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-[#14293a]">
                    {toTitleCase(activeCategoryParent.name)}
                  </h3>
                  {activeCategoryParent.description && (
                    <p className="text-xs text-[#6c7079] mt-0.5 line-clamp-1">
                      {activeCategoryParent.description}
                    </p>
                  )}
                </div>
                <Link
                  href={`/shop?category=${encodeURIComponent(
                    activeCategoryParent.slug || activeCategoryParent.name
                  )}`}
                  onClick={() => setActiveMegaMenu(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b91c1c] hover:underline"
                >
                  <span>View All {toTitleCase(activeCategoryParent.name)}</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </Link>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {activeCategoryChildren.map((child) => {
                  const cardImg = child.image_url || activeCategoryParent.image_url
                  return (
                    <Link
                      key={child.id}
                      href={`/shop?category=${encodeURIComponent(child.slug || child.name)}`}
                      onClick={() => setActiveMegaMenu(null)}
                      className="group block bg-white border border-[#e5e7eb] hover:border-[#14293a] rounded-sm overflow-hidden transition-colors"
                    >
                      <div className="relative aspect-[3/4] bg-[#f5f5f4] overflow-hidden">
                        <ProductImage
                          src={cardImg}
                          alt={child.name}
                          fill
                          sizes="200px"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5">
                        <span className="text-xs font-semibold text-[#14293a] group-hover:text-[#b91c1c] transition-colors block truncate">
                          {toTitleCase(child.name)}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ========================================================= */}
      {/* MOBILE ACCORDION DRAWER                                  */}
      {/* ========================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-4/5 max-w-sm h-full bg-white shadow-xl flex flex-col text-[#14293a]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between">
                <span className="font-sans text-xl font-black tracking-tight text-[#14293a]">
                  MAISON TG
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#6c7079] hover:text-[#14293a] rounded-sm"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {/* Mobile Search Trigger Button */}
              <div className="p-4 border-b border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setIsSearchModalOpen(true)
                  }}
                  className="w-full flex items-center bg-[#f8f8f8] hover:bg-[#f1f1f1] border border-[#d3d6db] text-xs px-3 py-2 text-[#6c7079] rounded-sm gap-2 text-left transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-[#6c7079]" strokeWidth={1.75} />
                  <span>Search hoodies, kurta sets, jackets...</span>
                </button>
              </div>

              {/* Mobile Bolt Try-On Service Link */}
              <div className="p-3 bg-[#f8f8f8] border-b border-[#e5e7eb]">
                <Link
                  href="/bolt"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full py-2.5 px-3 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-colors border ${
                    isBoltPage
                      ? 'bg-[#14293a] text-white border-[#14293a]'
                      : 'bg-white border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Bolt 45-Min Try-On</span>
                  </span>
                  <span className="text-[10px] font-medium uppercase opacity-75">
                    {isBoltPage ? 'Active Mode' : 'Explore →'}
                  </span>
                </Link>
              </div>

              {/* Category Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <Link
                    href="/shop?sort=newest"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-sm text-xs font-sans font-bold tracking-wide text-[#14293a] hover:bg-[#f8f8f8] hover:text-[#b91c1c] transition-colors"
                  >
                    <span>New Arrivals</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#b91c1c] text-white rounded-sm uppercase">
                      New
                    </span>
                  </Link>

                  <Link
                    href="/offers"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-sm text-xs font-sans font-bold tracking-wide text-[#b91c1c] bg-[#fef2f2] hover:bg-[#fee2e2] transition-colors"
                  >
                    <span>Offers &amp; Sale</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#b91c1c] text-white rounded-sm uppercase font-bold">
                      Sale
                    </span>
                  </Link>

                  {parentCategories.map((cat) => {
                    const children = subcategoriesMap[cat.id] || []
                    const hasChildren = children.length > 0
                    const isExpanded = expandedMobileCategory === cat.id

                    return (
                      <div key={cat.id} className="border-b border-[#f1f1f1] last:border-b-0">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex-1 py-2.5 px-3 rounded-sm text-xs font-sans font-bold tracking-wide text-[#14293a] hover:bg-[#f8f8f8] hover:text-[#b91c1c] transition-colors"
                          >
                            {toTitleCase(cat.name)}
                          </Link>
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => setExpandedMobileCategory(isExpanded ? null : cat.id)}
                              className="p-2.5 text-[#6c7079] hover:text-[#14293a]"
                              aria-label={`Toggle ${cat.name} subcategories`}
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                strokeWidth={1.75}
                              />
                            </button>
                          )}
                        </div>

                        {hasChildren && isExpanded && (
                          <div className="pl-3 pr-3 pb-3 space-y-1.5 bg-[#fcfcfc] border-t border-[#f1f1f1]">
                            <Link
                              href={`/shop?category=${encodeURIComponent(cat.slug || cat.name)}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block py-2 px-3 text-xs font-bold text-[#b91c1c] hover:underline"
                            >
                              View All {toTitleCase(cat.name)} →
                            </Link>
                            {children.map((child) => {
                              const thumbImg = child.image_url || cat.image_url
                              return (
                                <Link
                                  key={child.id}
                                  href={`/shop?category=${encodeURIComponent(
                                    child.slug || child.name
                                  )}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center gap-2.5 p-1.5 rounded-sm bg-white border border-[#e5e7eb] hover:border-[#14293a] text-xs text-[#14293a] transition-colors"
                                >
                                  <div className="w-9 h-11 relative bg-[#f5f5f4] rounded-sm overflow-hidden shrink-0">
                                    <ProductImage
                                      src={thumbImg}
                                      alt={child.name}
                                      fill
                                      sizes="36px"
                                    />
                                  </div>
                                  <span className="font-semibold block truncate">
                                    {toTitleCase(child.name)}
                                  </span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-[#e5e7eb] pt-4 space-y-2 text-xs font-sans">
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 text-[#6c7079] hover:text-[#14293a]"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2 px-3 text-[#6c7079] hover:text-[#14293a]"
                  >
                    <span className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>My Wishlist</span>
                    </span>
                    {wishlistCount > 0 && (
                      <span className="text-[10px] font-bold bg-[#b91c1c] text-white px-1.5 py-0.5 rounded-full">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setIsPincodeModalOpen(true)
                    }}
                    className="w-full flex items-center justify-between py-2 px-3 text-[#6c7079] hover:text-[#14293a] text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{pincode ? `Deliver to: ${pincode}` : 'Select Delivery PIN'}</span>
                    </span>
                    <span className="text-[10px] text-[#14293a] font-bold underline">
                      {pincode ? 'Change' : 'Set'}
                    </span>
                  </button>
                  {userEmail ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left py-2 px-3 text-[#b91c1c] font-semibold cursor-pointer"
                    >
                      Sign Out ({userEmail})
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 px-3 text-[#b91c1c] font-bold"
                    >
                      Sign In / Register
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Delivery Pincode Modal */}
      <PincodeModal
        isOpen={isPincodeModalOpen}
        onClose={() => setIsPincodeModalOpen(false)}
      />

      {/* Predictive Search Overlay (<dialog>) */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        categories={categories}
      />
    </header>
  )
}
