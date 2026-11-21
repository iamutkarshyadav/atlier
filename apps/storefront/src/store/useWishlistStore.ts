'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useState, useEffect } from 'react'
import type { Product } from '@repo/supabase/utils'

export interface WishlistState {
  items: Product[]
  itemIds: string[]
  isLoading: boolean

  // Actions
  isWishlisted: (productId: string) => boolean
  toggleWishlist: (product: Product) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  clearWishlist: () => void
  fetchWishlist: () => Promise<void>
  syncGuestWishlist: () => Promise<void>
  getItemCount: () => number
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      itemIds: [],
      isLoading: false,

      isWishlisted: (productId: string) => {
        return get().itemIds.includes(productId)
      },

      toggleWishlist: async (product: Product) => {
        const { itemIds, items } = get()
        const isPresent = itemIds.includes(product.id)

        if (isPresent) {
          // Optimistic remove
          const nextIds = itemIds.filter((id) => id !== product.id)
          const nextItems = items.filter((p) => p.id !== product.id)
          set({ itemIds: nextIds, items: nextItems })

          try {
            await fetch(`/api/wishlist?productId=${encodeURIComponent(product.id)}`, {
              method: 'DELETE',
            })
          } catch {
            // Local fallback persists
          }
        } else {
          // Optimistic add
          const nextIds = [product.id, ...itemIds]
          const nextItems = [product, ...items]
          set({ itemIds: nextIds, items: nextItems })

          try {
            await fetch('/api/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: product.id }),
            })
          } catch {
            // Local fallback persists
          }
        }
      },

      removeItem: async (productId: string) => {
        const { itemIds, items } = get()
        const nextIds = itemIds.filter((id) => id !== productId)
        const nextItems = items.filter((p) => p.id !== productId)
        set({ itemIds: nextIds, items: nextItems })

        try {
          await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
            method: 'DELETE',
          })
        } catch {
          // Local fallback persists
        }
      },

      clearWishlist: () => {
        set({ items: [], itemIds: [] })
      },

      fetchWishlist: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/wishlist')
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.items) && data.items.length > 0) {
              const serverItems: Product[] = data.items
              const serverIds = serverItems.map((p) => p.id)
              set({ items: serverItems, itemIds: serverIds })
            }
          }
        } catch {
          // Keep existing local items on network failure
        } finally {
          set({ isLoading: false })
        }
      },

      syncGuestWishlist: async () => {
        const { itemIds } = get()
        if (itemIds.length === 0) {
          await get().fetchWishlist()
          return
        }

        try {
          await fetch('/api/wishlist/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: itemIds }),
          })
        } catch {
          // Continue
        }

        await get().fetchWishlist()
      },

      getItemCount: () => {
        return get().itemIds.length
      },
    }),
    {
      name: 'atelier-wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/**
 * Hydrated hook for safe SSR in Next.js Client Components
 */
export function useHydratedWishlist() {
  const [isHydrated, setIsHydrated] = useState(false)
  const wishlist = useWishlistStore()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return {
    ...wishlist,
    isHydrated,
    items: isHydrated ? wishlist.items : [],
    itemIds: isHydrated ? wishlist.itemIds : [],
    itemCount: isHydrated ? wishlist.getItemCount() : 0,
    isWishlisted: (id: string) => (isHydrated ? wishlist.isWishlisted(id) : false),
  }
}
