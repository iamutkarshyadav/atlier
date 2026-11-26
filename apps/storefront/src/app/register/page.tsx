'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { createBrowserClient } from '@repo/supabase/browser'
import { AuthShell } from '../../components/auth/AuthShell'
import { mapAuthErrorMessage, sanitizeAuthRedirect } from '../../lib/authRedirect'

function RegisterForm() {
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl')
  const redirectTo = sanitizeAuthRedirect(rawRedirect, '/shop')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const hasMinLength = password.length >= 8
  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setAuthError('Please enter your full name.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter a valid email address.')
      return
    }
    if (!hasMinLength) {
      setAuthError('Password must be at least 8 characters long.')
      return
    }

    setIsLoading(true)
    setAuthError(null)

    try {
      const supabase = createBrowserClient()
      const cleanEmail = email.trim()
      const cleanPhone = phone.trim()

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            phone: cleanPhone || undefined,
            role: 'customer',
          },
        },
      })

      if (error) {
        setAuthError(mapAuthErrorMessage(error.message))
        setIsLoading(false)
        return
      }

      if (!data?.session) {
        await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        }).catch(() => null)

        const signInResult = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })

        if (signInResult.error || !signInResult.data?.session) {
          setAuthError(mapAuthErrorMessage(signInResult.error?.message))
          setIsLoading(false)
          return
        }
      }

      window.location.href = redirectTo
    } catch (err: any) {
      setAuthError(mapAuthErrorMessage(err?.message))
      setIsLoading(false)
    }
  }

  const loginHref =
    redirectTo !== '/shop' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'

  return (
    <AuthShell mode="register" redirectTo={redirectTo}>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-[#14293a]">
            Create Patron Account
          </h1>
          <p className="text-xs text-[#6c7079] leading-relaxed">
            Join Maison TG for faster checkout, live courier tracking, and Bolt 45-min doorstep fittings.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span className="leading-relaxed">{authError}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="register-name"
              className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#14293a]"
            >
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Aarav Mehta"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (authError) setAuthError(null)
              }}
              required
              className="w-full h-11 px-3.5 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-sm text-[#14293a] placeholder:text-[#9ca3af] rounded-sm transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="register-email"
              className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#14293a]"
            >
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (authError) setAuthError(null)
              }}
              required
              className="w-full h-11 px-3.5 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-sm text-[#14293a] placeholder:text-[#9ca3af] rounded-sm transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="register-phone"
                className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#14293a]"
              >
                Mobile Number
              </label>
              <span className="text-[10px] font-medium text-[#6c7079]">
                Optional · For Bolt updates
              </span>
            </div>
            <div className="flex">
              <span className="inline-flex items-center px-3 h-11 bg-[#f5f5f4] border border-r-0 border-[#d3d6db] text-xs font-semibold text-[#14293a] rounded-l-sm">
                +91
              </span>
              <input
                id="register-phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-sm text-[#14293a] placeholder:text-[#9ca3af] rounded-r-sm transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="register-password"
              className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#14293a]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (authError) setAuthError(null)
                }}
                required
                className="w-full h-11 pl-3.5 pr-11 bg-white border border-[#d3d6db] focus:border-[#14293a] focus:outline-none text-sm text-[#14293a] placeholder:text-[#9ca3af] rounded-sm transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-[#6c7079] hover:text-[#14293a] transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
            </div>

            {/* Password Requirement Indicators */}
            <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? 'text-emerald-700 font-medium' : 'text-[#6c7079]'
                }`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span>8+ characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasLetterAndNumber ? 'text-emerald-700 font-medium' : 'text-[#6c7079]'
                }`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span>Letter &amp; number</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#14293a] hover:bg-[#b91c1c] disabled:opacity-60 text-white font-sans font-bold text-xs uppercase tracking-[0.12em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isLoading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        <p className="pt-2 text-center text-xs text-[#6c7079]">
          Already have an account?{' '}
          <Link href={loginHref} className="text-[#b91c1c] font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default function StorefrontRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-xs text-[#6c7079] font-sans">
          Loading account registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
