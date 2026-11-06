'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useState, useEffect } from 'react'
import {
  calculateSubtotal,
  calculateTax,
  calculateShippingFee,
  calculateEstimatedTotal,
  BOLT_MAX_TRY_ON_ITEMS,
  BOLT_TRY_ON_FEE,
  type DeliveryMode,
} from './cartSubtotal'

export type { DeliveryMode }
export { BOLT_MAX_TRY_ON_ITEMS, BOLT_TRY_ON_FEE }

export interface CartItem {
  id: string
  productId: string
  title: string
  category: string
  edition: string
  price: number
  quantity: number
  image: string
  size?: string
}


export interface TryOnWindow {
  date: string
  timeSlot: string
}

interface CartStoreState {
  items: CartItem[]
  deliveryMode: DeliveryMode
  tryOnWindow: TryOnWindow | null
  boltLimitWarning: string | null

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => boolean
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  setQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setDeliveryMode: (mode: DeliveryMode) => void
  setTryOnWindow: (window: TryOnWindow | null) => void
  setBoltLimitWarning: (warning: string | null) => void

  // Computations
  getSubtotal: () => number
  getItemCount: () => number
  getTax: () => number
  getShippingFee: () => number
  getEstimatedTotal: () => number
  isOverBoltLimit: () => boolean
}

const DEFAULT_INITIAL_ITEMS: CartItem[] = [
  {
    id: 'prod_1',
    productId: 'prod_1',
    title: 'Sculptural Sandstone Vessel',
    category: 'Ceramics',
    edition: 'Edition 01 of 12',
    price: 185.0,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'prod_2',
    productId: 'prod_2',
    title: 'Carved Alabaster Pendant Cylinder',
    category: 'Lighting',
    edition: 'Edition 02 of 06',
    price: 420.0,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
  },
]

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryMode: 'direct',
      boltLimitWarning: null,
      tryOnWindow: {
        date: new Date(Date.now() + 86400000).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        timeSlot: '14:30 – 15:15 (Doorstep Salon)',
      },

      setBoltLimitWarning: (warning) => {
        set({ boltLimitWarning: warning })
      },

      addItem: (newItem) => {
        const currentItems = get().items
        const qtyToAdd = newItem.quantity && newItem.quantity > 0 ? newItem.quantity : 1
        const currentCount = get().getItemCount()

        // Bolt Try-On 5-item maximum enforcement
        if (get().deliveryMode === 'try_on' && currentCount + qtyToAdd > BOLT_MAX_TRY_ON_ITEMS) {
          set({
            boltLimitWarning: `Bolt ⚡ Doorstep Try-On is limited to a maximum of ${BOLT_MAX_TRY_ON_ITEMS} pieces per fitting session. You currently have ${currentCount} item(s) in your salon tray.`,
          })
          return false
        }

        set({ boltLimitWarning: null })
        const existingIndex = currentItems.findIndex(
          (item) => item.productId === newItem.productId && item.size === newItem.size
        )

        if (existingIndex > -1) {
          const updated = [...currentItems]
          const existing = updated[existingIndex]!
          updated[existingIndex] = {
            ...existing,
            quantity: existing.quantity + qtyToAdd,
          }
          set({ items: updated })
        } else {
          const itemKey = newItem.size ? `${newItem.productId}-${newItem.size}` : newItem.productId
          set({
            items: [
              ...currentItems,
              {
                ...newItem,
                id: newItem.id || itemKey,
                quantity: qtyToAdd,
              },
            ],
          })
        }
        return true
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
          boltLimitWarning: null,
        })
      },

      updateQuantity: (id, delta) => {
        const currentItems = get().items
        const target = currentItems.find((it) => it.id === id)
        if (target && delta > 0 && get().deliveryMode === 'try_on') {
          if (get().getItemCount() + delta > BOLT_MAX_TRY_ON_ITEMS) {
            set({
              boltLimitWarning: `Bolt ⚡ Try-On cannot exceed ${BOLT_MAX_TRY_ON_ITEMS} items per appointment.`,
            })
            return
          }
        }

        const updated = currentItems
          .map((item) => {
            if (item.id === id) {
              const next = item.quantity + delta
              return next > 0 ? { ...item, quantity: next } : null
            }
            return item
          })
          .filter((item): item is CartItem => item !== null)

        set({ items: updated, boltLimitWarning: null })
      },

      setQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }

        if (get().deliveryMode === 'try_on') {
          const otherItemsCount = get()
            .items.filter((it) => it.id !== id)
            .reduce((acc, curr) => acc + curr.quantity, 0)
          if (otherItemsCount + quantity > BOLT_MAX_TRY_ON_ITEMS) {
            set({
              boltLimitWarning: `Bolt ⚡ Try-On cannot exceed ${BOLT_MAX_TRY_ON_ITEMS} items per appointment.`,
            })
            return
          }
        }

        set({
          items: get().items.map((item) => (item.id === id ? { ...item, quantity } : item)),
          boltLimitWarning: null,
        })
      },

      clearCart: () => {
        set({ items: [], boltLimitWarning: null })
      },

      setDeliveryMode: (mode) => {
        set({
          deliveryMode: mode,
          boltLimitWarning:
            mode === 'try_on' && get().getItemCount() > BOLT_MAX_TRY_ON_ITEMS
              ? `Bolt ⚡ Doorstep Try-On accommodates up to ${BOLT_MAX_TRY_ON_ITEMS} items. Please trim your selection to 5 items to proceed with Bolt.`
              : null,
        })
      },

      setTryOnWindow: (window) => {
        set({ tryOnWindow: window })
      },

      // Computed Helpers
      getSubtotal: () => {
        return calculateSubtotal(get().items)
      },

      getItemCount: () => {
        return get().items.reduce((acc, curr) => acc + curr.quantity, 0)
      },

      getTax: () => {
        return calculateTax(get().getSubtotal())
      },

      getShippingFee: () => {
        return calculateShippingFee(get().getSubtotal(), get().deliveryMode)
      },

      getEstimatedTotal: () => {
        return calculateEstimatedTotal(get().getSubtotal(), get().getShippingFee(), get().getTax())
      },

      isOverBoltLimit: () => {
        return get().deliveryMode === 'try_on' && get().getItemCount() > BOLT_MAX_TRY_ON_ITEMS
      },
    }),
    {
      name: 'atelier-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/**
 * Custom hook to safely access cart state in Next.js client components without SSR hydration mismatch.
 */
export function useHydratedCart() {
  const [isHydrated, setIsHydrated] = useState(false)
  const cart = useCartStore()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return {
    ...cart,
    isHydrated,
    items: isHydrated ? cart.items : [],
    itemCount: isHydrated ? cart.getItemCount() : 0,
    subtotal: isHydrated ? cart.getSubtotal() : 0,
    tax: isHydrated ? cart.getTax() : 0,
    shippingFee: isHydrated ? cart.getShippingFee() : 0,
    estimatedTotal: isHydrated ? cart.getEstimatedTotal() : 0,
    isOverBoltLimit: isHydrated ? cart.isOverBoltLimit() : false,
    boltLimitWarning: isHydrated ? cart.boltLimitWarning : null,
  }
}
