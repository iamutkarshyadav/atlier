'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useState, useEffect } from 'react'

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

export type DeliveryMode = 'direct' | 'try_on'

export interface TryOnWindow {
  date: string
  timeSlot: string
}

interface CartStoreState {
  items: CartItem[]
  deliveryMode: DeliveryMode
  tryOnWindow: TryOnWindow | null

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  setQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setDeliveryMode: (mode: DeliveryMode) => void
  setTryOnWindow: (window: TryOnWindow | null) => void

  // Computations
  getSubtotal: () => number
  getItemCount: () => number
  getTax: () => number
  getShippingFee: () => number
  getEstimatedTotal: () => number
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
      tryOnWindow: {
        date: new Date(Date.now() + 86400000).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        timeSlot: '14:30 – 15:15 (Doorstep Salon)',
      },

      addItem: (newItem) => {
        const currentItems = get().items
        const qtyToAdd = newItem.quantity && newItem.quantity > 0 ? newItem.quantity : 1
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
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        })
      },

      updateQuantity: (id, delta) => {
        const updated = get()
          .items.map((item) => {
            if (item.id === id) {
              const next = item.quantity + delta
              return next > 0 ? { ...item, quantity: next } : null
            }
            return item
          })
          .filter((item): item is CartItem => item !== null)

        set({ items: updated })
      },

      setQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        set({
          items: get().items.map((item) => (item.id === id ? { ...item, quantity } : item)),
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      setDeliveryMode: (mode) => {
        set({ deliveryMode: mode })
      },

      setTryOnWindow: (window) => {
        set({ tryOnWindow: window })
      },

      // Computed Helpers
      getSubtotal: () => {
        return get().items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0)
      },

      getItemCount: () => {
        return get().items.reduce((acc, curr) => acc + curr.quantity, 0)
      },

      getTax: () => {
        return Number((get().getSubtotal() * 0.08).toFixed(2))
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal()
        if (subtotal === 0) return 0.0
        // Standard White-Glove Direct Acquisition: $25; At-Home Fitting Salon: $45
        return get().deliveryMode === 'try_on' ? 45.0 : 25.0
      },

      getEstimatedTotal: () => {
        const subtotal = get().getSubtotal()
        if (subtotal === 0) return 0.0
        return Number((subtotal + get().getShippingFee() + get().getTax()).toFixed(2))
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
  }
}
