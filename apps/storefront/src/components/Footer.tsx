'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'

export function Footer() {
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  if (
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register')
  ) {
    return null
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="border-t border-[#d3d6db] bg-[#f8f8f8] text-[#14293a] pt-14 pb-10 font-sans">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* ========================================================= */}
        {/* 4-COLUMN E-COMMERCE FOOTER NAVIGATION                    */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1: Shop Collections */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a] pb-1 border-b border-[#d3d6db]">
              Shop Collections
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6c7079]">
              <li>
                <Link href="/shop" className="hover:text-[#b91c1c] transition-colors">
                  All New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Hoodies%20%26%20Fleece" className="hover:text-[#b91c1c] transition-colors">
                  Hoodies & Fleece (480 GSM)
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Tees%20%26%20Tops" className="hover:text-[#b91c1c] transition-colors">
                  Tees & Tops (Vintage Washed)
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Outerwear%20%26%20Jackets" className="hover:text-[#b91c1c] transition-colors">
                  Outerwear & Flight Bombers
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Pants%20%26%20Denim" className="hover:text-[#b91c1c] transition-colors">
                  Pants & Japanese Selvedge Denim
                </Link>
              </li>
              <li>
                <Link href="/shop?delivery=try_on" className="text-[#b91c1c] font-semibold flex items-center gap-1 hover:underline">
                  <Zap className="w-3 h-3 text-[#b91c1c]" />
                  <span>Bolt Doorstep Try-On</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Customer Service */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a] pb-1 border-b border-[#d3d6db]">
              Customer Service
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6c7079]">
              <li>
                <Link href="/orders" className="hover:text-[#b91c1c] transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-[#b91c1c] transition-colors">
                  View Shopping Bag
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Bolt Doorstep Try-On Policy
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Shipping, Delivery & Returns
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Size Guide & Fit Assistance
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: About Maison TG */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a] pb-1 border-b border-[#d3d6db]">
              About Maison TG
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6c7079]">
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Fabric & Materials
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Quality Standards
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Sustainability
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#b91c1c] transition-colors">
                  Store Locations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter & Bolt Doorstep */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#14293a] pb-1 border-b border-[#d3d6db]">
              Stay Updated
            </h4>
            <p className="text-xs text-[#6c7079] leading-relaxed">
              Subscribe for updates on new arrivals, seasonal collections, and doorstep try-on availability.
            </p>

            {subscribed ? (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs flex items-center gap-2 rounded-sm">
                <Check className="w-4 h-4 text-[#b91c1c] shrink-0" />
                <span>Subscribed successfully. Welcome to Maison TG!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex items-center border border-[#d3d6db] bg-white rounded-sm overflow-hidden focus-within:border-[#14293a] transition-colors">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-transparent px-3 py-2 text-xs text-[#14293a] placeholder:text-[#8a909a] focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#14293a] text-white hover:bg-[#b91c1c] transition-colors text-xs font-bold tracking-wider uppercase shrink-0"
                  >
                    Join
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2">
              <div className="p-3 bg-white border border-[#d3d6db] rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#14293a]">
                  <Zap className="w-3.5 h-3.5 text-[#b91c1c]" />
                  <span>Bolt 45-Min Try-On</span>
                </div>
                <p className="text-[11px] text-[#6c7079]">
                  Available in serviceable pincodes. Try up to 5 items at home before buying.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM UTILITY & PAYMENT GUARANTEE BAR                   */}
        {/* ========================================================= */}
        <div className="pt-8 border-t border-[#d3d6db] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6c7079]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-sans font-bold text-[#14293a] text-sm">MAISON TG</span>
            <span>© 2026 Maison TG. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium text-[#6c7079]">
            <span>UPI</span>
            <span>•</span>
            <span>Credit & Debit Cards</span>
            <span>•</span>
            <span>NetBanking</span>
            <span>•</span>
            <span>Doorstep UPI / Cash</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
