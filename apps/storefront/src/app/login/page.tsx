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
  const callbackUrl = searchParams.get('callbackUrl') || '/#collection'
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
    <div className="max-w-sm w-full mx-auto my-auto py-8 space-y-6">
      {/* Checkout Session Preserved Banner */}
      {isFromCheckout && (
        <div className="p-3 bg-neutral-900 text-white text-xs font-mono space-y-1 border border-neutral-700">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#166534] font-bold">
            <Lock className="w-3.5 h-3.5" /> CHECKOUT SESSION PRESERVED
          </div>
          <p className="text-neutral-300 font-light text-[11px] leading-relaxed">
            Sign in to continue your order. Your shopping bag is preserved and waiting.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold block">
          CREATOR ACCOUNT
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase text-black tracking-tight leading-tight">
          SIGN IN TO <span className="text-[#166534] font-serif italic font-normal lowercase">atelier</span>
        </h1>
        <p className="text-xs text-neutral-500 font-light leading-relaxed">
          Access your saved addresses, track drop orders, and view past editions.
        </p>
      </div>

      {authError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
          {authError}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          variant="underline"
          placeholder="creator@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            variant="underline"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          size="xl"
          className="w-full h-14 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase tracking-[0.2em] rounded-none border border-black shadow-md flex items-center justify-center gap-2 transition-all"
          isLoading={isLoading}
        >
          <span>SIGN IN</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
        </Button>
      </form>

      <div className="pt-4 border-t border-neutral-200 text-center font-mono">
        <p className="text-xs text-neutral-500">
          New to Atelier?{' '}
          <Link
            href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
            className="text-black font-bold underline underline-offset-4 uppercase text-xs ml-1 hover:text-[#166534] transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function StorefrontLoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 flex flex-col justify-between p-12 lg:p-16 text-white z-10">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase font-mono tracking-wider text-neutral-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#166534]" /> Back to Store
            </Link>
            <span className="text-[10px] tracking-wider uppercase font-mono text-neutral-300 border border-neutral-700 px-3 py-1 bg-black/40 backdrop-blur-md">
              DROP 01 // ARCHIVE
            </span>
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-2 text-xs font-mono text-[#166534] uppercase tracking-wider font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
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
      <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 h-full min-h-screen">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-black tracking-[0.2em] text-black select-none">
            ATELIER
          </Link>
        </div>

        <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-neutral-400">Loading Account Session...</div>}>
          <LoginForm />
        </Suspense>

        <div className="text-xs uppercase font-mono text-neutral-400 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#166534]" />
          <span>Encrypted Session • Privacy Protected</span>
        </div>
      </div>
    </div>
  )
}
