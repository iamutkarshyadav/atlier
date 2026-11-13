'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react'
import { Button, Input } from '@repo/ui'
import { createBrowserClient } from '@repo/supabase/browser'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/#collection'
  const callbackUrl =
    rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//')
      ? rawCallbackUrl
      : '/#collection'
  const isFromCheckout = callbackUrl.includes('/checkout')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)

    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'customer',
          },
        },
      })

      if (error) {
        setAuthError(error.message)
        setIsLoading(false)
        return
      }

      await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => null)

      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInResult.error) {
        setAuthError(signInResult.error.message)
        setIsLoading(false)
        return
      }

      window.location.href = callbackUrl
    } catch (err: any) {
      setAuthError(err?.message || 'Registration error')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-sm w-full mx-auto my-auto py-8 space-y-6">
      {isFromCheckout && (
        <div className="p-3 bg-[#262629] text-white text-xs font-mono space-y-1 border border-white/10 rounded-xl">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#B91C1C] font-bold">
            <Lock className="w-3.5 h-3.5" /> CHECKOUT SESSION PRESERVED
          </div>
          <p className="text-neutral-300 font-light text-[11px] leading-relaxed">
            Create an account to complete your order. Your bag is preserved and waiting.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold block">
          CREATOR ACCOUNT
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight leading-tight">
          CREATE AN <span className="text-[#B91C1C] font-script font-normal lowercase text-5xl">account</span>
        </h1>
        <p className="text-xs text-neutral-400 font-light leading-relaxed">
          Save shipping addresses, track drop orders, and get early drop access.
        </p>
      </div>

      {authError && (
        <div className="p-3 bg-red-950/40 border border-[#B91C1C]/40 text-red-200 text-xs font-mono rounded-xl">
          {authError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <Input
          label="Full Name"
          type="text"
          variant="underline"
          placeholder="First & Last Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Email Address"
          type="email"
          variant="underline"
          placeholder="creator@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          variant="underline"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          size="xl"
          className="w-full h-14 bg-[#38393D] hover:bg-[#4A4B50] text-white font-mono font-bold text-xs uppercase tracking-[0.2em] rounded-full border border-white/15 shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          isLoading={isLoading}
        >
          <span>CREATE ACCOUNT</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
        </Button>
      </form>

      <div className="pt-4 border-t border-white/10 text-center font-mono">
        <p className="text-xs text-neutral-400">
          Already have an account?{' '}
          <Link
            href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
            className="text-white font-bold underline underline-offset-4 uppercase text-xs ml-1 hover:text-[#B91C1C] transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function StorefrontRegisterPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#212121] text-white">
      {/* Editorial Visual Half */}
      <div className="relative hidden lg:block lg:col-span-7 h-full min-h-screen bg-black overflow-hidden group">
        <Image
          src="/images/auth-editorial.jpg"
          alt="Atelier Creator Apparel"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="object-cover object-center brightness-90 contrast-[1.05] transition-transform duration-[2000ms] ease-out group-hover:scale-105"
        />
        {/* Subtle Gradient & Editorial Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#212121] via-black/30 to-black/50 flex flex-col justify-between p-12 lg:p-16 text-white z-10">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase font-mono tracking-wider text-neutral-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#B91C1C]" /> Back to Store
            </Link>
            <span className="text-[10px] tracking-wider uppercase font-mono text-neutral-300 border border-white/20 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full">
              DROP 01 // ARCHIVE
            </span>
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-2 text-xs font-mono text-[#B91C1C] uppercase tracking-wider font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
              <span>COLLECTION 01 • AUTONOMOUS GARMENTS</span>
            </div>
            <blockquote className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
              &ldquo;FORM FOLLOWS SILHOUETTE. ENGINEERED EXCLUSIVELY FOR THE CREATOR.&rdquo;
            </blockquote>
            <div className="flex items-center gap-4 pt-2 text-xs uppercase font-mono text-neutral-400">
              <span>480 GSM French Terry</span>
              <span>•</span>
              <span>14oz Selvedge Denim</span>
              <span>•</span>
              <span>Worldwide Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Half */}
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 h-full min-h-screen bg-[#1A1B1D] border-l border-white/10">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-script tracking-wide text-white select-none">
            Tg
          </Link>
        </div>

        <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-neutral-400">Loading Account Session...</div>}>
          <RegisterForm />
        </Suspense>

        <div className="text-xs uppercase font-mono text-neutral-400 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B91C1C]" />
          <span>Encrypted Session • Privacy Protected</span>
        </div>
      </div>
    </div>
  )
}
