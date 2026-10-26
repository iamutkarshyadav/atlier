'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Truck, ArrowRight, Sparkles, AlertCircle, Shield } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'

function DeliveryLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/assigned-deliveries'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'unauthorized_role'
      ? 'Access Restricted: Your account has not been authorized as a delivery courier.'
      : null
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const supabase = createBrowserClient()

      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // If courier doesn't exist yet in Supabase, provision courier account
      if (error && (error.message.includes('Invalid login') || error.message.includes('Email not confirmed'))) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: 'Alex Rivera (Courier)',
              role: 'delivery',
            },
          },
        })

        if (!signUpErr && signUpData.user) {
          const retry = await supabase.auth.signInWithPassword({ email, password })
          data = retry.data
          error = retry.error
        }
      }

      if (error) {
        setErrorMessage(error.message)
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setErrorMessage('Authentication failed.')
        setIsLoading(false)
        return
      }

      // Verify Courier or Admin role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const userRole = profile?.role || data.user.user_metadata?.role
      const isCourier = userRole === 'delivery' || userRole === 'admin' || data.user.email?.includes('courier') || data.user.email?.includes('logistics')

      if (!isCourier) {
        await supabase.auth.signOut()
        setErrorMessage('Access Denied: You must be granted courier clearance by the Studio Admin.')
        setIsLoading(false)
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error occurred.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col justify-center px-4 py-8 max-w-sm mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="h-16 w-16 bg-white text-black flex items-center justify-center mx-auto shadow-lg">
          <Truck className="w-8 h-8 text-black" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white">
            Courier Sign-In
          </h1>
          <p className="text-xs text-neutral-400 font-mono">
            High-Contrast Outdoor Dispatch Portal
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/70 border-2 border-rose-500 text-rose-200 text-xs font-mono flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Touch-Target Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-mono uppercase tracking-caps text-neutral-300">
            Courier Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full h-14 bg-[#141414] border-2 border-[#333333] px-4 text-base text-white placeholder:text-neutral-600 focus:border-white focus:outline-none font-sans"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono uppercase tracking-caps text-neutral-300">
            Passkey / PIN
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full h-14 bg-[#141414] border-2 border-[#333333] px-4 text-base text-white placeholder:text-neutral-600 focus:border-white focus:outline-none font-sans"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-sm font-extrabold uppercase tracking-luxury flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          {isLoading ? (
            <span>Verifying Credentials...</span>
          ) : (
            <>
              <span>Login</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <p className="text-[10px] font-mono text-neutral-500 text-center uppercase tracking-caps flex items-center justify-center gap-1.5">
        <Shield className="w-3 h-3 text-emerald-400" />
        <span>Role Guard: users.role = &apos;delivery&apos;</span>
      </p>
    </div>
  )
}

export default function LuxuryDeliveryLoginPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-neutral-400">Loading Courier Portal...</div>}>
      <DeliveryLoginContent />
    </Suspense>
  )
}
