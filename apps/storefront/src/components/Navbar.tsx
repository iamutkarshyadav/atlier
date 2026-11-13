'use client'

import React, { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { useHydratedCart } from '../store/useCartStore'
import { useHydratedBolt } from '../store/useBoltStore'
import { createBrowserClient } from '@repo/supabase/browser'
import { ThemeSelector } from './ThemeSelector'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Gentleman'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === '/'

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isMenuHovered, setIsMenuHovered] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const { itemCount } = useHydratedCart()
  const { city: boltCity } = useHydratedBolt()

  // Track scroll position for subtle backdrop when scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto focus search input when search modal opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Handle escape key to close menu or search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Resolve user session
  useEffect(() => {
    const supabase = createBrowserClient()

    async function resolveUserProfile(authUser: any) {
      if (!authUser) {
        setUserEmail(null)
        setUserName(null)
        return
      }

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
      } catch {
        // Fallback
      }

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
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      setUserEmail(null)
      setUserName(null)
      setMenuOpen(false)
      router.refresh()
    } catch {
      // Continue
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/shop?category=${encodeURIComponent(searchQuery.trim())}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  // Live cart count
  const displayCartBadge = itemCount

  const navItems = [
    { num: '01', label: 'THE ATELIER HOME', href: '/', subtitle: 'Return to flagship split screen' },
    { num: '02', label: 'CURATED CATALOGUE', href: '/shop', subtitle: 'Explore limited 480 GSM apparel' },
    { num: '03', label: 'BOLT ⚡ TRY-ON SALON', href: '/shop?try_on=true', subtitle: '45-minute in-home private fitting' },
    { num: '04', label: 'BRAND HERITAGE', href: '/about', subtitle: 'Wakayama loopwheel & Kojima shuttle looms' },
    { num: '05', label: 'SHOPPING BAG', href: '/cart', subtitle: `${itemCount} curated garments in bag`, badge: itemCount > 0 ? itemCount : undefined },
    ...(userName ? [{ num: '06', label: 'PATRON ORDERS', href: '/orders', subtitle: 'Live dispatch & fitting settlements' }] : []),
  ]

  return (
    <>
      {/* ========================================================= */}
      {/* FIXED / ABSOLUTE TOP NAVBAR OVERLAY */}
      {/* ========================================================= */}
      <header
        className={`w-full z-50 transition-all duration-300 ${
          isHome
            ? `fixed top-0 left-0 right-0 ${
                scrolled
                  ? 'bg-[#1e1e21]/90 backdrop-blur-md border-b border-white/10 py-4 shadow-lg'
                  : 'bg-transparent py-6'
              }`
            : 'sticky top-0 bg-[#1e1e21] text-white border-b border-white/10 shadow-md py-4'
        }`}
      >
        <div className="w-full px-6 sm:px-10 lg:px-14 flex items-center justify-between">
          {/* Left: Elegant Script "Tg" Logo linking to Home */}
          <Link
            href="/"
            className="group flex items-center select-none"
            aria-label="Tg Atelier Home"
          >
            <span className="font-script text-3xl sm:text-4xl lg:text-5xl text-white font-normal hover:opacity-85 transition-opacity tracking-wider drop-shadow-sm">
              Tg
            </span>
          </Link>

          {/* Right: Theme Selector, Cart, Search, and Bespoke Asymmetric Hamburger Menu */}
          <div className="flex items-center gap-3 sm:gap-5 text-neutral-300">
            {/* Theme Selector Toggle (Dark, White, System) */}
            <ThemeSelector variant="compact" />

            {/* 1. Shopping Cart Icon with Live Badge */}
            <Link
              href="/cart"
              className="relative p-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
              {displayCartBadge > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#B91C1C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none shadow-md">
                  {displayCartBadge}
                </span>
              )}
            </Link>

            {/* 2. Search Icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Search Collection"
            >
              <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
            </button>

            {/* 3. Bespoke Asymmetric Morphing Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              onMouseEnter={() => setIsMenuHovered(true)}
              onMouseLeave={() => setIsMenuHovered(false)}
              className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer relative w-9 h-9 flex flex-col justify-center items-end gap-1.5 group"
              aria-label={menuOpen ? 'Close Menu' : 'Open Bespoke Menu'}
            >
              <span
                className={`h-[1.5px] bg-white transition-all duration-300 ease-out origin-center ${
                  menuOpen
                    ? 'w-6 rotate-45 translate-y-[4px]'
                    : 'w-6 group-hover:bg-red-400'
                }`}
              />
              <span
                className={`h-[1.5px] bg-white transition-all duration-300 ease-out origin-center ${
                  menuOpen
                    ? 'w-6 -rotate-45 -translate-y-[3.5px]'
                    : isMenuHovered
                    ? 'w-6 bg-red-400'
                    : 'w-4'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dropdown / Inline Search Bar */}
        {searchOpen && (
          <div className="w-full px-6 sm:px-10 lg:px-14 py-3 bg-[#18181a]/95 backdrop-blur-md border-t border-b border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-2xl mx-auto flex items-center gap-3"
            >
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search luxury atelier, suiting, selvedge denim, 480 GSM hoodies..."
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                className="btn-dark px-4 py-1.5 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] text-xs font-mono font-semibold uppercase transition-colors shrink-0 rounded-none border border-neutral-700 dark:border-white/15 cursor-pointer shadow-sm"
              >
                <span style={{ color: '#ffffff' }}>Search</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* BESPOKE GLASSMORPHISM NAVIGATION OVERLAY */}
      {/* ========================================================= */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setMenuOpen(false)}
            />

            {/* Dual-Pane Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-full max-w-2xl sm:max-w-3xl bg-[#1A1B1D]/95 backdrop-blur-2xl border-l border-white/10 text-white p-7 sm:p-12 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto"
            >
              {/* Drawer Top Bar */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="font-script text-3xl sm:text-4xl text-white font-normal"
                >
                  Tg
                </Link>

                <div className="flex items-center gap-3">
                  <ThemeSelector variant="segmented" />
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-none hover:bg-white/5"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Content: Split Columns on Desktop */}
              <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Column: Editorial Heritage & Fleet Status */}
                <div className="hidden md:flex md:col-span-5 flex-col justify-between space-y-8 pr-6 border-r border-white/10">
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#B91C1C] font-bold block">
                      ARCHIVE // DROP 01
                    </span>
                    <blockquote className="font-serif italic text-lg text-neutral-300 leading-snug">
                      &ldquo;Form follows textile. Engineered with raw material integrity, deliberate proportions, and uncompromising permanence.&rdquo;
                    </blockquote>
                  </div>

                  <div className="space-y-4 font-mono text-xs text-neutral-400">
                    <div>
                      <p className="text-white font-bold text-[11px] uppercase tracking-wider">Provenance</p>
                      <p className="text-[10px] mt-0.5">Wakayama Loopwheel Mills &amp; Kojima Shuttle Looms</p>
                    </div>

                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#262629] border border-white/10 rounded-none text-[10px] text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-none bg-emerald-400 animate-ping" />
                        <span>FLEET: ACTIVE IN {boltCity ? boltCity.toUpperCase() : 'BENGALURU & MUMBAI'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Numbered Navigation Stack */}
                <nav className="md:col-span-7 space-y-4">
                  {navItems.map((item, idx) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx, duration: 0.3 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center justify-between py-2 border-b border-white/5 hover:border-white/20 transition-all cursor-pointer"
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono text-xs font-bold text-[#B91C1C]">
                            {item.num}
                          </span>
                          <div>
                            <span className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white group-hover:text-red-400 group-hover:translate-x-1.5 transition-all block">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                              {item.subtitle}
                            </span>
                          </div>
                        </div>

                        {item.badge ? (
                          <span className="px-2 py-0.5 bg-[#B91C1C] text-white font-bold font-mono text-xs rounded-none">
                            {item.badge}
                          </span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-neutral-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#B91C1C]" />
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </nav>
              </div>

              {/* Drawer Footer / Patron Session */}
              <div className="pt-6 border-t border-white/10 text-xs text-neutral-400 font-sans flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {userName ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none bg-[#262629] border border-white/10 text-white flex items-center justify-center font-bold text-xs">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{userName}</p>
                        {userEmail && (
                          <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="py-1.5 px-3 bg-[#262629] hover:bg-[#38393D] text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors rounded-none border border-white/10 font-mono text-xs cursor-pointer"
                    >
                      <span>Sign Out</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
                    <p className="text-[11px] text-neutral-400 font-mono">
                      Patron fitting reservations &amp; doorstep salon status.
                    </p>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                      className="btn-dark py-2 px-6 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono font-bold text-xs uppercase tracking-wider rounded-none border border-neutral-700 dark:border-white/15 transition-all shadow-md cursor-pointer"
                    >
                      <span style={{ color: '#ffffff' }}>Sign In to Account →</span>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
