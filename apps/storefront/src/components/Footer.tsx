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
    <footer className="mt-32 border-t border-zinc-900 bg-[#0A0A0A] text-white pt-20 pb-14 px-6 sm:px-12 font-sans selection:bg-amber-400 selection:text-black">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Top: Atelier Brand Manifesto & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7 space-y-5">
            <Link href="/" className="inline-block group">
              <span className="text-3xl sm:text-4xl font-black tracking-[0.2em] block text-white uppercase group-hover:text-amber-400 transition-colors">
                ATELIER
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl font-light leading-relaxed">
              Architectural creator apparel engineered in limited size runs. Milled exclusively from 480 GSM Wakayama loopwheel French Terry and 14.5oz Okayama raw selvedge denim. Zero synthetic polyester blending.
            </p>

            <div className="pt-1 flex items-center gap-3 text-[11px] font-mono text-amber-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/10 border border-amber-400/30">
                <Zap className="w-3 h-3 fill-amber-400" />
                Bolt ⚡ White-Glove Doorstep Try-On Active
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="text-zinc-500 hidden sm:inline font-mono">Bengaluru • Mumbai • Delhi NCR • Hyderabad</span>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4 bg-zinc-900/60 border border-zinc-800 p-6">
            <div className="space-y-1">
              <span className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5 tracking-wider">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Join the Atelier Insider
              </span>
              <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                Receive private early access passes 1 hour before limited-run public drops and secret doorstep salon slot releases.
              </p>
            </div>

            {subscribed ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Access Granted. You are on the private drop manifest.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex items-center border border-zinc-700 bg-black/60 focus-within:border-amber-400 transition-colors p-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@domain.com"
                    className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none font-mono"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs uppercase font-bold tracking-wider font-mono shrink-0 transition-colors"
                  >
                    Join →
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Strictly no promotional spam. Unsubscribe at any time.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Middle: Organized Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-zinc-900 text-xs font-mono">
          {/* Col 1: Shop */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-zinc-400 font-bold tracking-wider">
              Shop Catalogue
            </h4>
            <ul className="space-y-2 text-zinc-400">
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
            <h4 className="text-[10px] uppercase font-mono text-amber-400/90 font-bold tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
              The Bolt Experience
            </h4>
            <ul className="space-y-2 text-zinc-400">
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
                <span className="text-zinc-500">Serviceable PINs (Bengaluru, Mumbai, Delhi)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: About */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-zinc-400 font-bold tracking-wider">
              Atelier Archive
            </h4>
            <ul className="space-y-2 text-zinc-400">
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
            <h4 className="text-[10px] uppercase font-mono text-zinc-400 font-bold tracking-wider">
              Patron Care & Concierge
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li>
                <Link href="/cart" className="hover:text-white transition-colors">
                  Fitting Bag
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Track Dispatches & Reconciliations
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
        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400">
              Accepted Doorstep & Online Settlement:
            </span>
          </div>

          {/* Clean Payment Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="px-2 py-1 bg-zinc-900 text-white border border-zinc-800">
              ⚡ UPI (GPay / PhonePe / Paytm)
            </span>
            <span className="px-2 py-1 bg-zinc-900 text-white border border-zinc-800">
              RuPay
            </span>
            <span className="px-2 py-1 bg-zinc-900 text-white border border-zinc-800">
              Visa
            </span>
            <span className="px-2 py-1 bg-zinc-900 text-white border border-zinc-800">
              Mastercard
            </span>
            <span className="px-2 py-1 bg-zinc-900 text-white border border-zinc-800">
              NetBanking
            </span>
          </div>
        </div>

        {/* Bottom: Copyright & Legal */}
        <div className="pt-6 border-t border-zinc-900/60 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] tracking-widest uppercase text-zinc-500 gap-4 font-mono">
          <p>© {new Date().getFullYear()} ATELIER APPAREL ARCHIVE. ALL RIGHTS RESERVED.</p>
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
    </footer>
  )
}
