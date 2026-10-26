'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, LogOut, ChevronDown, ShoppingBag, Package } from 'lucide-react'
import { useHydratedCart } from '../store/useCartStore'
import { createBrowserClient } from '@repo/supabase/browser'
import { getCategories, type Category } from '@repo/supabase/utils'

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Patron'
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function Navbar() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const { itemCount } = useHydratedCart()

  // Scroll detection for backdrop effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load Categories & Subscribe to Auth State Changes
  useEffect(() => {
    const supabase = createBrowserClient()

    getCategories(supabase)
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]))

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
      } catch (err) {
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

      setUserName('Creator Patron')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveUserProfile(session.user)
    })

    supabase.auth.getUser().then(({ data: { user } }) => {
      resolveUserProfile(user)
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
      setAccountMenuOpen(false)
      router.refresh()
    } catch {
      // Continue
    }
  }

  // Pre-formatted clean category labels
  const navItems = [
    { label: 'All', href: '/#collection' },
    { label: 'Hoodies', href: '/?category=hoodies#collection' },
    { label: 'Tees', href: '/?category=tees#collection' },
    { label: 'Outerwear', href: '/?category=outerwear#collection' },
    { label: 'Pants', href: '/?category=pants#collection' },
  ]

  return (
    <>
      {/* Top Announcement Bar (Always at the very top of viewport) */}
      <div className="w-full bg-black text-white border-b border-neutral-900 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] sm:text-[11px] font-mono uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
            <span className="text-white bg-[#166534] px-1.5 py-0.5 font-bold text-[9px] tracking-wider">DROP 01</span>
            <span className="text-neutral-500 hidden sm:inline">•</span>
            <span className="text-neutral-300 hidden sm:inline">
              HEAVYWEIGHT 480 GSM FLEECE & 14OZ RAW DENIM
            </span>
          </div>
          <div className="text-neutral-400 font-mono hidden md:block">
            LIMITED EDITION RUN • COMPLIMENTARY WORLDWIDE DISPATCH
          </div>
          <div className="text-neutral-300 font-mono text-[10px] md:hidden">
            WORLDWIDE DISPATCH
          </div>
        </div>
      </div>

      {/* Main Sticky Navigation Bar (True 3-Column Balanced Layout) */}
      <header
        className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md transition-all duration-300 border-b ${
          scrolled ? 'border-neutral-300 shadow-sm' : 'border-neutral-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 grid grid-cols-12 items-center">
          {/* Left Column: Navigation Links (Never wrap onto 2 lines) */}
          <nav className="col-span-4 hidden lg:flex items-center gap-5 xl:gap-7 text-xs font-mono uppercase tracking-wider font-semibold text-neutral-600">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap hover:text-black transition-colors relative group py-1"
              >
                {item.label}
                <span className="absolute left-0 bottom-0 w-0 h-[1.5px] bg-[#166534] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Center Column: Perfectly Centered Brand Logo */}
          <div className="col-span-8 lg:col-span-4 flex items-center lg:justify-center">
            <Link
              href="/"
              className="flex items-center text-left lg:text-center select-none group"
            >
              <span className="text-xl sm:text-2xl font-black tracking-[0.2em] text-black leading-none group-hover:opacity-80 transition-opacity">
                ATELIER
              </span>
            </Link>
          </div>

          {/* Right Column: User Account, Bag, and Mobile Toggle */}
          <div className="col-span-4 flex items-center justify-end gap-3 sm:gap-5 text-xs font-mono uppercase tracking-wider font-semibold text-neutral-800">
            {userName ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-2 py-1.5 px-3 border border-neutral-300 hover:border-black bg-white text-black transition-all shadow-sm"
                  aria-expanded={accountMenuOpen}
                >
                  <span className="w-4 h-4 bg-black text-[#166534] text-[10px] font-bold flex items-center justify-center">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[100px] sm:max-w-[140px] truncate hidden sm:inline">
                    {userName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 shadow-xl p-4 space-y-3 z-50 text-left">
                    <div className="border-b border-neutral-100 pb-3 space-y-0.5">
                      <h3 className="font-bold text-xs uppercase text-black truncate">
                        {userName}
                      </h3>
                      {userEmail && (
                        <p className="text-[11px] text-neutral-500 lowercase truncate font-sans">
                          {userEmail}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 pt-1">
                      <Link
                        href="/orders"
                        onClick={() => setAccountMenuOpen(false)}
                        className="w-full text-left py-2 px-2.5 text-xs font-mono text-neutral-800 hover:text-black hover:bg-neutral-50 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-[#166534]" />
                          <span>My Orders</span>
                        </span>
                        <span className="text-[10px] text-neutral-400">→</span>
                      </Link>

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left py-2 px-2.5 text-xs font-mono text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-between transition-colors pt-2 border-t border-neutral-100"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-block px-3 py-1.5 border border-neutral-300 hover:border-black text-black transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Shopping Bag Button with Dark Green Badge */}
            <Link
              href="/cart"
              className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white transition-colors group"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#166534]" />
              <span className="hidden sm:inline font-mono">Bag</span>
              <span className="px-1.5 py-0.2 bg-[#166534] text-white text-[10px] font-bold font-mono">
                {itemCount}
              </span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-black hover:bg-neutral-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white p-6 flex flex-col justify-between lg:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-5 border-b border-neutral-200">
            <span className="text-xl font-black tracking-wider text-black">
              ATELIER
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-black"
              aria-label="Close navigation"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col space-y-4 py-8 text-sm font-mono uppercase tracking-wider font-semibold">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-neutral-100 hover:text-[#166534] transition-colors"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-neutral-100 flex items-center justify-between text-black"
            >
              <span>Shopping Bag</span>
              <span className="px-2 py-0.5 bg-[#166534] text-white font-bold text-xs font-mono">
                {itemCount}
              </span>
            </Link>

            {userName && (
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-neutral-100 flex items-center justify-between text-black"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#166534]" />
                  <span>My Orders</span>
                </span>
                <span className="text-xs text-neutral-400">→</span>
              </Link>
            )}
          </nav>

          <div className="pt-4 border-t border-neutral-200 text-xs font-mono text-neutral-500">
            {userName ? (
              <div className="flex items-center justify-between">
                <span>Signed in as {userName}</span>
                <button onClick={handleSignOut} className="text-rose-600 font-bold">
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-3 bg-black text-white font-bold uppercase tracking-wider"
              >
                Sign In to Account
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
