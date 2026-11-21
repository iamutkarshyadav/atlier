'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { Button, Input } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/shop'
  const callbackUrl =
    rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//')
      ? rawCallbackUrl
      : '/shop'
  const isFromCheckout = callbackUrl.includes('/checkout')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)

    try {
      const supabase = createBrowserClient()
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error && error.message.toLowerCase().includes('not confirmed')) {
        try {
          const confRes = await fetch('/api/auth/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          if (confRes.ok) {
            const retry = await supabase.auth.signInWithPassword({
              email,
              password,
            })
            data = retry.data
            error = retry.error
          }
        } catch {
          // Continue
        }
      }

      if (error || !data?.session) {
        setAuthError(error?.message || 'Authentication failed. Please verify credentials.')
        setIsLoading(false)
        return
      }

      window.location.href = callbackUrl
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-sm w-full mx-auto my-auto py-8 space-y-6 font-sans text-[#14293a]">
      {/* Checkout Session Preserved Banner */}
      {isFromCheckout && (
        <div className="p-3 bg-[#fef2f2] text-[#b91c1c] text-xs space-y-1 border border-[#fecaca] rounded-sm">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
            <Lock className="w-3.5 h-3.5" /> CHECKOUT SESSION PRESERVED
          </div>
          <p className="text-[#991b1b] text-[11px] leading-relaxed">
            Sign in to continue your order. Your shopping bag is preserved and waiting.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-[#14293a]">
          Sign In
        </h1>
        <p className="text-xs text-[#6c7079] leading-relaxed">
          Access your saved addresses, track your orders, and book doorstep fittings.
        </p>
      </div>

      {authError && (
        <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-sm">
          {authError}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          autoComplete="username"
          placeholder="patron@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          size="xl"
          className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] text-white font-sans font-bold text-xs uppercase tracking-wider rounded-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
          isLoading={isLoading}
        >
          <span>SIGN IN</span>
        </Button>
      </form>

      <div className="pt-4 border-t border-[#e5e7eb] text-center text-xs text-[#6c7079]">
        <p>
          New to Maison Tg?{' '}
          <Link
            href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
            className="text-[#b91c1c] font-bold hover:underline ml-1"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function StorefrontLoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-[#14293a] font-sans">
      {/* Editorial Visual Half */}
      <div className="relative hidden lg:block lg:col-span-7 h-full min-h-screen bg-[#f8f8f8] overflow-hidden group">
        <Image
          src="/images/auth-editorial.jpg"
          alt="Maison Tg Atelier"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 flex flex-col justify-between p-12 lg:p-16 text-white z-10">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#b91c1c]" /> Back to Store
            </Link>
            <span className="text-[10px] tracking-wider uppercase font-bold text-white border border-white/30 px-3 py-1 bg-black/40 backdrop-blur-md rounded-sm">
              MAISON TG
            </span>
          </div>

          <div className="space-y-3 max-w-lg">
            <span className="text-xs font-bold text-[#fca5a5] uppercase tracking-wider block">
              FEATURED CRAFT
            </span>
            <blockquote className="font-sans text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
              &ldquo;FORM FOLLOWS SILHOUETTE. ENGINEERED EXCLUSIVELY FOR THE MODERN GENTLEMAN.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3 pt-2 text-xs uppercase text-neutral-300">
              <span>480 GSM French Terry</span>
              <span>•</span>
              <span>14oz Japanese Selvedge</span>
              <span>•</span>
              <span>Doorstep Try-On</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Half */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 h-full min-h-screen bg-white border-l border-[#d3d6db]">
        <div className="flex items-center">
          <Link href="/" className="font-sans text-2xl font-black tracking-tight text-[#14293a]">
            MAISON TG
          </Link>
        </div>

        <Suspense fallback={<div className="py-24 text-center text-xs text-[#6c7079]">Loading Account Session...</div>}>
          <LoginForm />
        </Suspense>

        <div className="text-xs text-[#8a909a] text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#b91c1c]" />
          <span>Encrypted Session • Privacy Protected</span>
        </div>
      </div>
    </div>
  )
}
