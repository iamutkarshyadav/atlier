'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Lock, Package, ShieldCheck, ShoppingBag, Zap } from 'lucide-react'

/**
 * Strictly sanitizes authentication redirect targets so only internal relative paths
 * beginning with a single '/' are permitted (prevents open-redirect attacks).
 */
export function sanitizeAuthRedirect(raw: string | null | undefined, fallback = '/shop'): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('://') ||
    trimmed.includes('\\')
  ) {
    return fallback
  }
  return trimmed
}

export interface AuthShellProps {
  mode: 'login' | 'register'
  redirectTo: string
  children: React.ReactNode
}

export function AuthShell({ mode, redirectTo, children }: AuthShellProps) {
  const isFromCheckout = redirectTo.startsWith('/checkout')
  const querySuffix =
    redirectTo && redirectTo !== '/shop' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#14293a] font-sans">
      {/* Compact distraction-free top utility bar */}
      <header className="sticky top-0 z-40 h-16 w-full bg-white border-b border-[#d3d6db]">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link href="/" className="group shrink-0">
            <span className="font-sans text-xl sm:text-2xl font-black tracking-tight text-[#14293a] group-hover:text-[#b91c1c] transition-colors leading-none block">
              MAISON TG
            </span>
          </Link>

          <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6c7079]">
            <Lock className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
            <span>Secure Patron Access</span>
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6c7079] hover:text-[#14293a] transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Back to Store</span>
          </Link>
        </div>
      </header>

      {/* Main Split Editorial Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Editorial Column (Desktop) */}
        <aside className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#14293a] border-r border-[#d3d6db] overflow-hidden">
          <Image
            src="/images/auth-editorial.jpg"
            alt="Maison TG Atelier Editorial"
            fill
            priority
            sizes="(max-width: 1024px) 0vw, 58vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b26]/90 via-[#0d1b26]/35 to-[#0d1b26]/20" />

          <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14 text-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 border border-white/30 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] rounded-sm">
                Atelier Flagship · Est. 2024
              </span>
              <span className="text-[11px] font-medium text-white/80 tracking-wide">
                Bengaluru · Mumbai · New Delhi
              </span>
            </div>

            <div className="space-y-6 max-w-xl">
              <div className="space-y-2.5">
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#fca5a5]">
                  Tailored Wardrobes &amp; Express Doorstep Fittings
                </span>
                <h2 className="font-sans text-3xl xl:text-4xl font-black tracking-tight text-white leading-[1.12]">
                  Architectural silhouettes engineered for effortless daily wear.
                </h2>
              </div>

              {/* 3-Column Patron Benefit Strip */}
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Zap className="w-3.5 h-3.5 text-[#fca5a5]" strokeWidth={1.75} />
                    <span>45-Min Bolt Try-On</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Try up to 5 pieces at home before paying for what you keep.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Package className="w-3.5 h-3.5 text-[#fca5a5]" strokeWidth={1.75} />
                    <span>Live Order Tracking</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Real-time dispatch milestones, courier PIN verification &amp; invoices.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#fca5a5]" strokeWidth={1.75} />
                    <span>Saved Addresses</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Sync your wishlist and complete express checkout in seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Form Column */}
        <section className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between bg-[#ffffff] px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
          <div className="w-full max-w-[400px] mx-auto my-auto space-y-6">
            {/* Checkout Session Preserved Banner */}
            {isFromCheckout && (
              <div className="p-3.5 bg-[#f8f8f8] border border-[#d3d6db] border-l-2 border-l-[#b91c1c] rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b91c1c]">
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Checkout Session Preserved</span>
                </div>
                <p className="text-xs text-[#14293a] leading-relaxed">
                  Your bag is saved. Sign in or create an account to resume checkout cleanly.
                </p>
              </div>
            )}

            {/* Segmented Mode Switcher */}
            <div
              role="tablist"
              aria-label="Account mode"
              className="grid grid-cols-2 p-1 bg-[#f5f5f4] border border-[#d3d6db] rounded-sm"
            >
              <Link
                href={`/login${querySuffix}`}
                role="tab"
                aria-selected={mode === 'login'}
                className={`h-9 flex items-center justify-center text-xs font-bold uppercase tracking-[0.1em] rounded-sm transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-[#14293a] border border-[#d3d6db]'
                    : 'text-[#6c7079] hover:text-[#14293a] border border-transparent'
                }`}
              >
                Sign In
              </Link>
              <Link
                href={`/register${querySuffix}`}
                role="tab"
                aria-selected={mode === 'register'}
                className={`h-9 flex items-center justify-center text-xs font-bold uppercase tracking-[0.1em] rounded-sm transition-colors ${
                  mode === 'register'
                    ? 'bg-white text-[#14293a] border border-[#d3d6db]'
                    : 'text-[#6c7079] hover:text-[#14293a] border border-transparent'
                }`}
              >
                Create Account
              </Link>
            </div>

            {children}
          </div>

          {/* Minimal Trust Bar */}
          <div className="w-full max-w-[400px] mx-auto pt-8 mt-6 border-t border-[#e5e7eb] flex items-center justify-between text-[11px] text-[#6c7079]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#14293a]" strokeWidth={1.75} />
              <span>256-Bit Encrypted Session</span>
            </span>
            <Link href="/orders" className="hover:text-[#14293a] underline underline-offset-4">
              Track Order as Guest
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
