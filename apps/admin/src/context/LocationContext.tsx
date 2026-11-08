'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@repo/supabase/browser'
import { getLocations, type StoreLocation, type PosSession } from '@repo/supabase/utils'

export const FALLBACK_LOCATIONS: StoreLocation[] = [
  {
    id: 'l1000000-0000-0000-0000-000000000001',
    code: 'BLR-WH01',
    name: 'Atelier Central Mother Hub (Bengaluru)',
    type: 'warehouse',
    gstin: '29AAAAA0000A1Z5',
    state_code: '29',
    address_line1: 'Phase 1, Electronic City Industrial Area',
    address_line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    phone: '+91 80 4000 1100',
    email: 'hub.blr@atelier.com',
    is_active: true,
    online_fulfillment_priority: 10,
    online_safety_buffer: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'l1000000-0000-0000-0000-000000000002',
    code: 'BLR-ST01',
    name: 'Indiranagar Flagship Boutique (Bengaluru)',
    type: 'boutique',
    gstin: '29AAAAA0000A1Z5',
    state_code: '29',
    address_line1: '100 Feet Road, HAL 2nd Stage, Indiranagar',
    address_line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    phone: '+91 80 4000 2200',
    email: 'indiranagar@atelier.com',
    is_active: true,
    online_fulfillment_priority: 20,
    online_safety_buffer: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'l1000000-0000-0000-0000-000000000003',
    code: 'BOM-ST01',
    name: 'Kala Ghoda Heritage Boutique (Mumbai)',
    type: 'boutique',
    gstin: '27AAAAA0000A1Z5',
    state_code: '27',
    address_line1: 'VB Gandhi Marg, Kala Ghoda, Fort',
    address_line2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '+91 22 4000 3300',
    email: 'mumbai@atelier.com',
    is_active: true,
    online_fulfillment_priority: 30,
    online_safety_buffer: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

interface LocationContextType {
  locations: StoreLocation[]
  activeLocation: 'ALL' | StoreLocation
  activeLocationId?: string
  activeLocationCode: string
  activeLocationName: string
  activePosSession: PosSession | null
  isLoading: boolean
  setActiveLocation: (location: 'ALL' | StoreLocation) => void
  setActivePosSession: (session: PosSession | null) => void
  refreshLocations: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const STORAGE_KEY_LOCATION = 'atelier_erp_active_location_id'
const STORAGE_KEY_SESSION = 'atelier_erp_pos_session'

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<StoreLocation[]>(FALLBACK_LOCATIONS)
  const [activeLocation, setActiveLocationState] = useState<'ALL' | StoreLocation>('ALL')
  const [activePosSession, setActivePosSessionState] = useState<PosSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshLocations = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const data = await getLocations(supabase)
      if (data && data.length > 0) {
        setLocations(data)
      } else {
        setLocations(FALLBACK_LOCATIONS)
      }
    } catch {
      setLocations(FALLBACK_LOCATIONS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshLocations()
  }, [refreshLocations])

  // Restore persisted selections from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedLocId = localStorage.getItem(STORAGE_KEY_LOCATION)
      if (savedLocId && savedLocId !== 'ALL') {
        const found = locations.find((l) => l.id === savedLocId || l.code === savedLocId)
        if (found) {
          setActiveLocationState(found)
        }
      } else if (savedLocId === 'ALL') {
        setActiveLocationState('ALL')
      }

      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION)
      if (savedSession) {
        setActivePosSessionState(JSON.parse(savedSession))
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }, [locations])

  const setActiveLocation = useCallback((loc: 'ALL' | StoreLocation) => {
    setActiveLocationState(loc)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOCATION, loc === 'ALL' ? 'ALL' : loc.id)
    }
  }, [])

  const setActivePosSession = useCallback((session: PosSession | null) => {
    setActivePosSessionState(session)
    if (typeof window !== 'undefined') {
      if (session) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION)
      }
    }
  }, [])

  return (
    <LocationContext.Provider
      value={{
        locations,
        activeLocation,
        activeLocationId: activeLocation === 'ALL' ? locations[0]?.id : activeLocation.id,
        activeLocationCode: activeLocation === 'ALL' ? 'ALL' : activeLocation.code,
        activeLocationName: activeLocation === 'ALL' ? 'Global Aggregate ATP' : activeLocation.name,
        activePosSession,
        isLoading,
        setActiveLocation,
        setActivePosSession,
        refreshLocations,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
