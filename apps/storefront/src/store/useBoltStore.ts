'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useState, useEffect } from 'react'

export interface BoltState {
  pincode: string | null
  city: string | null
  isServiceable: boolean
  selectedTimeslotId: string | null

  // Actions
  setPincode: (pin: string, valid: boolean, city?: string | null) => void
  setSelectedTimeslotId: (id: string | null) => void
  clearPincode: () => void
}

export const useBoltStore = create<BoltState>()(
  persist(
    (set) => ({
      pincode: null,
      city: null,
      isServiceable: false,
      selectedTimeslotId: null,

      setPincode: (pin: string, valid: boolean, city: string | null = null) => {
        set({
          pincode: pin.trim(),
          isServiceable: valid,
          city: city,
        })
      },

      setSelectedTimeslotId: (id: string | null) => {
        set({ selectedTimeslotId: id })
      },

      clearPincode: () => {
        set({
          pincode: null,
          city: null,
          isServiceable: false,
          selectedTimeslotId: null,
        })
      },
    }),
    {
      name: 'atelier-bolt-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/**
 * Hydrated hook for safe SSR in Next.js Client Components
 */
export function useHydratedBolt() {
  const [isHydrated, setIsHydrated] = useState(false)
  const bolt = useBoltStore()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return {
    ...bolt,
    isHydrated,
    pincode: isHydrated ? bolt.pincode : null,
    city: isHydrated ? bolt.city : null,
    isServiceable: isHydrated ? bolt.isServiceable : false,
    selectedTimeslotId: isHydrated ? bolt.selectedTimeslotId : null,
  }
}

