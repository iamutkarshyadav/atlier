'use client'

import { useEffect, useRef, useCallback } from 'react'

interface ScannerOptions {
  onScan: (barcode: string) => void
  minChars?: number
  maxIntervalMs?: number
  enabled?: boolean
}

export function useBarcodeScanner({
  onScan,
  minChars = 4,
  maxIntervalMs = 35,
  enabled = true,
}: ScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional hotkeys like Ctrl, Alt, Meta
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      const now = performance.now()
      const interval = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        // If Enter is hit and buffer has minChars within barcode cadence, process scan
        if (bufferRef.current.length >= minChars) {
          e.preventDefault()
          e.stopPropagation()
          const scanned = bufferRef.current.trim()
          bufferRef.current = ''
          onScan(scanned)
          return
        }
        bufferRef.current = ''
        return
      }

      // If user is typing slowly in a text field, reset buffer and do not capture
      if (isInput && interval > maxIntervalMs) {
        bufferRef.current = ''
        return
      }

      if (e.key.length === 1) {
        if (interval > maxIntervalMs) {
          // New burst start
          bufferRef.current = e.key
        } else {
          // Rapid hardware scanner pulse
          bufferRef.current += e.key
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onScan, minChars, maxIntervalMs, enabled])

  // Expose manual test trigger for development/testing without USB hardware
  const simulateScan = useCallback(
    (barcode: string) => {
      if (barcode.trim().length >= minChars) {
        onScan(barcode.trim())
      }
    },
    [onScan, minChars]
  )

  return { simulateScan, isListening: enabled }
}
