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
    <footer className="mt-24 border-t border-[#E4E4E0] bg-[#F2F2F0] text-[#09090B] pt-16 pb-12 px-6 sm:px-12 font-sans selection:bg-[#B91C1C] selection:text-white">
      <div className="mx-auto max-w-7xl space-y-14">
        {/* Top: Atelier Brand Manifesto & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-7 space-y-4">
            <Link href="/" className="inline-block group">
              <span className="font-script text-4xl sm:text-5xl block text-[#09090B] font-normal group-hover:text-[#B91C1C] transition-colors">
                Tg
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-[#71717A] font-mono block mt-1">
                Luxury Atelier Archive for the Real Gentleman
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-[#52525B] max-w-xl font-normal leading-relaxed">
              Architectural creator apparel engineered in limited size runs. Milled exclusively from 480 GSM Wakayama loopwheel French Terry and 14.5oz Okayama raw selvedge denim. Zero synthetic blending.
            </p>

            <div className="pt-1 flex items-center gap-3 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-[#B91C1C] rounded-none shadow-sm font-semibold">
                <Zap className="w-3 h-3 fill-[#B91C1C] text-[#B91C1C]" />
                Bolt ⚡ White-Glove Doorstep Try-On Active
              </span>
              <span className="text-neutral-300 hidden sm:inline">•</span>
              <span className="text-[#71717A] hidden sm:inline font-mono">Bengaluru • Mumbai • Delhi NCR • Hyderabad</span>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4 bg-white border border-[#E4E4E0] p-6 shadow-sm rounded-none">
            <div className="space-y-1">
              <span className="text-xs uppercase font-mono font-bold text-[#09090B] flex items-center gap-1.5 tracking-wider">
                <Lock className="w-3.5 h-3.5 text-[#B91C1C]" />
                Join the Atelier Private Access
              </span>
              <p className="text-[11px] text-[#71717A] font-normal leading-relaxed">
                Receive private early access passes 1 hour before limited-run public drops and secret doorstep salon slot releases.
              </p>
            </div>

            {subscribed ? (
              <div className="p-3 bg-red-50 border border-red-200 text-[#B91C1C] text-xs font-mono flex items-center gap-2 rounded-none">
                <Check className="w-4 h-4 text-[#B91C1C] shrink-0" />
                <span>Access Granted. You are on the private drop manifest.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex items-center border border-[#D4D4D8] bg-[#F8F8F6] focus-within:border-[#09090B] transition-colors p-1 rounded-none">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@domain.com"
                    className="w-full bg-transparent px-3 py-1.5 text-xs text-[#09090B] placeholder:text-neutral-400 focus:outline-none font-mono"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#09090B] hover:bg-[#27272A] text-white text-xs uppercase font-bold tracking-wider font-mono shrink-0 transition-colors rounded-none cursor-pointer shadow-sm"
                  >
                    Join →
                  </button>
                </div>
                <p className="text-[10px] text-[#71717A] font-mono pl-1">
                  Strictly no promotional spam. Unsubscribe at any time.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Middle: Organized Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-10 border-t border-[#E4E4E0] text-xs font-mono">
          {/* Col 1: Shop */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-[#09090B] font-bold tracking-wider">
              Shop Catalogue
            </h4>
            <ul className="space-y-2 text-[#52525B]">
              <li>
                <Link href="/shop" className="hover:text-[#09090B] transition-colors">
                  All Drop 01 Pieces
                </Link>
              </li>
              <li>
                <Link href="/shop?category=hoodies" className="hover:text-[#09090B] transition-colors">
                  480 GSM Heavyweight Hoodies
                </Link>
              </li>
              <li>
                <Link href="/shop?category=tees" className="hover:text-[#09090B] transition-colors">
                  280 GSM Overdyed Vintage Tees
                </Link>
              </li>
              <li>
                <Link href="/shop?category=pants" className="hover:text-[#09090B] transition-colors">
                  Japanese Raw Selvedge Denim
                </Link>
              </li>
              <li>
                <Link href="/shop?category=outerwear" className="hover:text-[#09090B] transition-colors">
                  Technical Flight Outerwear
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: The Experience */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-[#B91C1C] font-bold tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 fill-[#B91C1C] text-[#B91C1C]" />
              The Bolt Experience
            </h4>
            <ul className="space-y-2 text-[#52525B]">
              <li>
                <Link href="/about#bolt" className="hover:text-[#09090B] transition-colors">
                  How Doorstep Try-On Works
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-[#09090B] transition-colors">
                  Curate 5 Pieces (₹99 Hold)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#09090B] transition-colors">
                  45m White-Glove Fitting Window
                </Link>
              </li>
              <li>
                <span className="text-[#71717A]">Serviceable PINs (Bengaluru, Mumbai, Delhi)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: About */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-[#09090B] font-bold tracking-wider">
              Atelier Archive
            </h4>
            <ul className="space-y-2 text-[#52525B]">
              <li>
                <Link href="/about" className="hover:text-[#09090B] transition-colors">
                  Our Brand Heritage
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#09090B] transition-colors">
                  Wakayama Loopwheel Knits
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#09090B] transition-colors">
                  Okayama Denim Shuttles
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#09090B] transition-colors">
                  Zero Synthetic Manifesto
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Patron Care */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-[#09090B] font-bold tracking-wider">
              Patron Care &amp; Concierge
            </h4>
            <ul className="space-y-2 text-[#52525B]">
              <li>
                <Link href="/cart" className="hover:text-[#09090B] transition-colors">
                  Fitting Bag
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-[#09090B] transition-colors">
                  Track Dispatches &amp; Reconciliations
                </Link>
              </li>
              <li>
                <a href="mailto:concierge@atelier.com" className="hover:text-[#09090B] transition-colors">
                  concierge@atelier.com
                </a>
              </li>
              <li>
                <a href="tel:+919886012345" className="hover:text-[#09090B] transition-colors">
                  +91 98860 12345 (Dispatch Desk)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Accepted Payment Methods Bar */}
        <div className="pt-6 border-t border-[#E4E4E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs text-[#71717A]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#09090B] font-bold">
              Accepted Doorstep &amp; Online Settlement:
            </span>
          </div>

          {/* Clean Payment Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="px-2.5 py-1 bg-white text-[#09090B] border border-[#E4E4E0] rounded-none">
              ⚡ UPI (GPay / PhonePe / Paytm)
            </span>
            <span className="px-2.5 py-1 bg-white text-[#09090B] border border-[#E4E4E0] rounded-none">
              RuPay
            </span>
            <span className="px-2.5 py-1 bg-white text-[#09090B] border border-[#E4E4E0] rounded-none">
              Visa
            </span>
            <span className="px-2.5 py-1 bg-white text-[#09090B] border border-[#E4E4E0] rounded-none">
              Mastercard
            </span>
            <span className="px-2.5 py-1 bg-white text-[#09090B] border border-[#E4E4E0] rounded-none">
              NetBanking
            </span>
          </div>
        </div>

        {/* Bottom: Copyright & Legal */}
        <div className="pt-6 border-t border-[#E4E4E0] flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] tracking-widest uppercase text-[#71717A] gap-4 font-mono text-xs">
          <p>© {new Date().getFullYear()} TG ATELIER LUXURY ARCHIVE. ALL RIGHTS RESERVED.</p>
          <div className="flex flex-wrap gap-5">
            <span className="hover:text-[#09090B] cursor-pointer transition-colors">
              Terms of Salon
            </span>
            <span className="hover:text-[#09090B] cursor-pointer transition-colors">
              White-Glove Protocol
            </span>
            <span className="hover:text-[#09090B] cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="hover:text-[#09090B] cursor-pointer transition-colors">
              Textile Care Matrix
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
