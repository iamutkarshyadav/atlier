'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, X, Navigation, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useHydratedBolt } from '../store/useBoltStore'

interface PincodeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PincodeModal({ isOpen, onClose }: PincodeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { pincode, city, isServiceable, isHydrated, setPincode } = useHydratedBolt()

  const [inputPin, setInputPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
      setInputPin(pincode || '')
      setErrorMsg(null)
      setSuccessMsg(null)
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen, pincode])

  const handleVerifyPincode = async (pinToVerify: string) => {
    const trimmed = pinToVerify.trim()
    if (!/^\d{6}$/.test(trimmed)) {
      setErrorMsg('Please enter a valid 6-digit Indian postal PIN.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/bolt/check-pincode?pin=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.serviceable) {
        setPincode(trimmed, true, data.city || null)
        setSuccessMsg(`45-minute Bolt Try-On is available in ${data.city || 'your area'} (${trimmed})!`)
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setPincode(trimmed, false, data.city || null)
        setErrorMsg(data.message || `PIN ${trimmed} is outside 45-min delivery radius. Standard shipping is active.`)
      }
    } catch {
      setErrorMsg('Failed to check postal code serviceability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleVerifyPincode(inputPin)
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.')
      return
    }

    setDetecting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude

          const res = await fetch(
            `/api/bolt/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
          )
          const data = await res.json()

          if (data.success && data.pincode && /^\d{6}$/.test(data.pincode)) {
            setInputPin(data.pincode)
            await handleVerifyPincode(data.pincode)
          } else {
            setErrorMsg(
              data.error || 'Could not determine a valid 6-digit Indian PIN from your location. Please enter it manually.'
            )
          }
        } catch {
          setErrorMsg('Location reverse geocoding failed. Please enter your 6-digit PIN manually.')
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        setDetecting(false)
        if (err.code === 1) {
          setErrorMsg('Location permission denied. Please enter your 6-digit PIN below.')
        } else {
          setErrorMsg('Location detection timed out. Please enter your PIN manually.')
        }
      },
      { enableHighAccuracy: false, timeout: 6000 }
    )
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-xs max-w-md w-full mx-auto my-auto rounded-sm shadow-2xl focus:outline-none"
    >
      <div className="bg-white border border-[#d3d6db] text-[#14293a] font-sans p-6 rounded-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#14293a]" />
            <h2 className="text-base font-bold text-[#14293a]">Choose delivery location</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#6c7079] hover:text-[#14293a] transition-colors rounded cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Location Meta */}
        <div className="py-4 space-y-4">
          {isHydrated && pincode && (
            <div className="p-3 bg-[#f8f8f8] border border-[#e5e7eb] rounded-sm text-xs flex items-center justify-between">
              <div>
                <span className="text-[#6c7079]">Current Selection: </span>
                <span className="font-bold text-[#14293a]">{pincode}</span>
                {city ? <span className="text-[#6c7079]"> ({city})</span> : null}
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs ${
                  isServiceable
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isServiceable ? 'Bolt Active' : 'Standard Delivery'}
              </span>
            </div>
          )}

          {/* Auto-Detect Button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting || loading}
            className="w-full h-10 border border-[#14293a] text-[#14293a] hover:bg-[#f8f8f8] text-xs font-semibold rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {detecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#14293a]" />
                <span>Detecting location...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-[#14293a]" />
                <span>Use Current Location</span>
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#e5e7eb] w-full" />
            <span className="bg-white px-2 text-[11px] text-[#6c7079] uppercase tracking-wider absolute">
              or enter pin
            </span>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={inputPin}
                onChange={(e) => {
                  setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                placeholder="Enter 6-digit PIN"
                className="flex-1 h-10 px-3 text-sm font-mono tracking-wider bg-[#f8f8f8] border border-[#d3d6db] rounded-sm placeholder:font-sans placeholder:tracking-normal placeholder:text-[#8a909a] focus:outline-none focus:border-[#14293a] focus:bg-white"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || detecting || inputPin.length !== 6}
                className="h-10 px-4 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-[#14293a] flex items-center justify-center gap-1.5 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Apply</span>}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-[#b91c1c] font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#b91c1c]" />
                <span>{errorMsg}</span>
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#e5e7eb] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#6c7079] hover:text-[#14293a] bg-white border border-[#d3d6db] rounded-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}
