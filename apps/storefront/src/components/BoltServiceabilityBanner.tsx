'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Zap, MapPin, CheckCircle2, AlertCircle, Loader2, ArrowRight, X } from 'lucide-react'
import { useHydratedBolt } from '../store/useBoltStore'

export function BoltServiceabilityBanner() {
  const pathname = usePathname()
  const { pincode, city, isServiceable, setPincode, clearPincode, isHydrated } = useHydratedBolt()
  const [inputPin, setInputPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isChanging, setIsChanging] = useState(false)

  // Don't render on homepage hero where full promo banner is featured
  if (pathname === '/') {
    return null
  }

  // Don't render with flash before hydration
  if (!isHydrated) {
    return (
      <div className="bg-[#f8f8f8] text-[#14293a] text-xs py-2 px-4 text-center border-b border-[#d3d6db] font-sans">
        <div className="inline-flex items-center gap-1.5 opacity-90">
          <Zap className="w-3.5 h-3.5 text-[#b91c1c] fill-[#b91c1c]" />
          <span>Bolt Doorstep Try-On: 45-Minute In-Home Service</span>
        </div>
      </div>
    )
  }

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputPin.trim()
    if (!trimmed) return

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.serviceable) {
        setPincode(trimmed, true, data.city)
        setIsChanging(false)
        setInputPin('')
        setErrorMsg(null)
      } else {
        setPincode(trimmed, false, null)
        setErrorMsg(data.message || `PIN ${trimmed} is not serviceable for Bolt`)
      }
    } catch {
      setErrorMsg('Failed to verify serviceability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    clearPincode()
    setIsChanging(true)
    setInputPin('')
    setErrorMsg(null)
  }

  // State 1: Active Serviceable PIN
  if (isServiceable && pincode && !isChanging) {
    return (
      <div className="bg-[#ecfdf5] border-b border-[#a7f3d0] text-[#065f46] px-4 py-2 text-xs font-sans transition-colors duration-200">
        <div className="max-w-[1320px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span className="font-semibold text-[#064e3b] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" />
              Bolt Doorstep Try-On Active:
            </span>
            <span>
              Available in <strong className="text-[#064e3b] underline decoration-emerald-500">{city || 'your area'}</strong> (PIN: <span className="font-semibold text-[#065f46]">{pincode}</span>). Maximum 5 pieces per fitting session.
            </span>
          </div>

          <button
            onClick={handleReset}
            className="text-[11px] uppercase tracking-wider text-[#065f46] hover:text-[#064e3b] underline underline-offset-2 transition-colors ml-auto flex items-center gap-1 cursor-pointer font-bold"
          >
            Change PIN
          </button>
        </div>
      </div>
    )
  }

  // State 2: Active Non-Serviceable PIN notification
  if (!isServiceable && pincode && !isChanging) {
    return (
      <div className="bg-[#fffbeb] border-b border-[#fde68a] text-[#92400e] px-4 py-2 text-xs font-sans">
        <div className="max-w-[1320px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#92400e]">
            <AlertCircle className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
            <span>
              Bolt Try-On is not yet live in PIN <strong className="text-[#78350f]">{pincode}</strong>. Standard express shipping applies.
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-[11px] uppercase tracking-wider text-[#b45309] hover:text-[#78350f] underline underline-offset-2 transition-colors cursor-pointer font-bold"
          >
            Check Another PIN
          </button>
        </div>
      </div>
    )
  }

  // State 3: Prompting input (No PIN set or Changing PIN)
  return (
    <div className="bg-[#f8f8f8] border-b border-[#d3d6db] text-[#14293a] px-4 py-2 text-xs font-sans">
      <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="bg-[#fef2f2] text-[#b91c1c] p-1 rounded-sm border border-[#fecaca]">
            <Zap className="w-3.5 h-3.5 fill-[#b91c1c] text-[#b91c1c]" />
          </span>
          <span className="font-semibold text-[#14293a]">
            Experience Bolt 45-Minute Doorstep Try-On:
          </span>
          <span className="hidden md:inline text-[#6c7079]">
            Try up to 5 pieces at home before paying.
          </span>
        </div>

        <form onSubmit={handleCheck} className="flex items-center gap-1.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <MapPin className="w-3.5 h-3.5 text-[#8a909a] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={inputPin}
              onChange={(e) => {
                setInputPin(e.target.value)
                setErrorMsg(null)
              }}
              placeholder="Enter 6-digit PIN"
              className="w-full bg-white border border-[#d3d6db] rounded-sm px-2.5 py-1 pl-8 text-xs text-[#14293a] placeholder-[#8a909a] focus:outline-none focus:border-[#14293a]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || inputPin.trim().length === 0}
            className="bg-[#14293a] hover:bg-[#b91c1c] text-white font-semibold px-3 py-1 rounded-sm text-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Check</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
          {isChanging && (
            <button
              type="button"
              onClick={() => setIsChanging(false)}
              className="text-[#6c7079] hover:text-[#14293a] p-1"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {errorMsg && (
        <div className="max-w-[1320px] mx-auto mt-1.5 text-center text-[#b91c1c] text-[11px] flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
