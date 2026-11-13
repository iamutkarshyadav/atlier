'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  CreditCard,
  Lock,
} from 'lucide-react'
import { ThemeSelector } from './ThemeSelector'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="mt-32 border-t border-white/10 bg-[#1A1B1D] text-white pt-20 pb-14 px-6 sm:px-12 font-sans selection:bg-[#B91C1C] selection:text-white">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Top: Atelier Brand Manifesto & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 space-y-5">
            <Link href="/" className="inline-block group">
              <span className="font-script text-4xl sm:text-5xl block text-white font-normal group-hover:text-red-400 transition-colors">
                Tg
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono block mt-1">
                Luxury Atelier Archive for the Real Gentleman
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl font-light leading-relaxed">
              Architectural creator apparel engineered in limited size runs. Milled exclusively from 480 GSM Wakayama loopwheel French Terry and 14.5oz Okayama raw selvedge denim. Zero synthetic polyester blending.
            </p>

            <div className="pt-1 flex items-center gap-3 text-[11px] font-mono text-red-600 dark:text-red-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 rounded-none shadow-sm font-semibold">
                <Zap className="w-3 h-3 fill-red-600 text-red-600 dark:fill-red-500 dark:text-red-500" />
                Bolt ⚡ White-Glove Doorstep Try-On Active
              </span>
              <span className="text-neutral-400 dark:text-neutral-600 hidden sm:inline">•</span>
              <span className="text-neutral-600 dark:text-neutral-400 hidden sm:inline font-mono">Bengaluru • Mumbai • Delhi NCR • Hyderabad</span>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4 bg-[#262629] border border-white/10 p-6 shadow-xl rounded-none">
            <div className="space-y-1">
              <span className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5 tracking-wider">
                <Lock className="w-3.5 h-3.5 text-red-500" />
                Join the Atelier Private Access
              </span>
              <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                Receive private early access passes 1 hour before limited-run public drops and secret doorstep salon slot releases.
              </p>
            </div>

            {subscribed ? (
              <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-mono flex items-center gap-2 rounded-none">
                <Check className="w-4 h-4 text-red-400 shrink-0" />
                <span>Access Granted. You are on the private drop manifest.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex items-center border border-white/15 bg-black/60 focus-within:border-red-500 transition-colors p-1 rounded-none">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@domain.com"
                    className="w-full bg-transparent px-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none font-mono"
                    required
                  />
                  <button
                    type="submit"
                    style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                    className="btn-dark px-5 py-2 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] text-xs uppercase font-bold tracking-wider font-mono shrink-0 transition-colors rounded-none cursor-pointer shadow-sm"
                  >
                    <span style={{ color: '#ffffff' }}>Join →</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono pl-3">
                  Strictly no promotional spam. Unsubscribe at any time.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Middle: Organized Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/10 text-xs font-mono">
          {/* Col 1: Shop */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-300 font-bold tracking-wider">
              Shop Catalogue
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  All Drop 01 Pieces
                </Link>
              </li>
              <li>
                <Link href="/shop?category=hoodies" className="hover:text-white transition-colors">
                  480 GSM Heavyweight Hoodies
                </Link>
              </li>
              <li>
                <Link href="/shop?category=tees" className="hover:text-white transition-colors">
                  280 GSM Overdyed Vintage Tees
                </Link>
              </li>
              <li>
                <Link href="/shop?category=pants" className="hover:text-white transition-colors">
                  Japanese Raw Selvedge Denim
                </Link>
              </li>
              <li>
                <Link href="/shop?category=outerwear" className="hover:text-white transition-colors">
                  Technical Flight Outerwear
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: The Experience */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-red-400 font-bold tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 fill-red-400 text-red-400" />
              The Bolt Experience
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/about#bolt" className="hover:text-white transition-colors">
                  How Doorstep Try-On Works
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  Curate 5 Pieces (₹99 Hold)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  45m White-Glove Fitting Window
                </Link>
              </li>
              <li>
                <span className="text-neutral-500">Serviceable PINs (Bengaluru, Mumbai, Delhi)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: About */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-300 font-bold tracking-wider">
              Atelier Archive
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Our Brand Heritage
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Wakayama Loopwheel Knits
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Okayama Denim Shuttles
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Zero Synthetic Manifesto
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Patron Care */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-300 font-bold tracking-wider">
              Patron Care &amp; Concierge
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/cart" className="hover:text-white transition-colors">
                  Fitting Bag
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Dispatches &amp; Reconciliations
                </Link>
              </li>
              <li>
                <a href="mailto:concierge@atelier.com" className="hover:text-white transition-colors">
                  concierge@atelier.com
                </a>
              </li>
              <li>
                <a href="tel:+919886012345" className="hover:text-white transition-colors">
                  +91 98860 12345 (Dispatch Desk)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Accepted Payment Methods Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-neutral-300">
              Accepted Doorstep &amp; Online Settlement:
            </span>
          </div>

          {/* Clean Payment Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="px-3 py-1 bg-[#262629] text-white border border-white/10 rounded-none">
              ⚡ UPI (GPay / PhonePe / Paytm)
            </span>
            <span className="px-3 py-1 bg-[#262629] text-white border border-white/10 rounded-none">
              RuPay
            </span>
            <span className="px-3 py-1 bg-[#262629] text-white border border-white/10 rounded-none">
              Visa
            </span>
            <span className="px-3 py-1 bg-[#262629] text-white border border-white/10 rounded-none">
              Mastercard
            </span>
            <span className="px-3 py-1 bg-[#262629] text-white border border-white/10 rounded-none">
              NetBanking
            </span>
          </div>
        </div>

        {/* Bottom: Theme Selector, Copyright & Legal */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-[10px] tracking-widest uppercase text-neutral-400">
              Appearance:
            </span>
            <ThemeSelector variant="segmented" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] tracking-widest uppercase text-neutral-400 gap-4">
            <p>© {new Date().getFullYear()} TG ATELIER LUXURY ARCHIVE. ALL RIGHTS RESERVED.</p>
            <div className="flex flex-wrap gap-5">
              <span className="hover:text-white cursor-pointer transition-colors">
                Terms of Salon
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">
                White-Glove Protocol
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">
                Privacy Policy
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">
                Textile Care Matrix
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
