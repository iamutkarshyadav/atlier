'use client'

import React, { useState, useEffect } from 'react'
import { COMPONENT_REGISTRY } from './registry'
import type { LayoutNode, Product, PageLayout } from '@repo/supabase/utils'
import { createBrowserClient } from '@repo/supabase/browser'

interface LayoutRendererProps {
  initialLayout: LayoutNode[]
  pageSlug?: string
  products?: Product[]
}

export function LayoutRenderer({
  initialLayout,
  pageSlug = 'home',
  products,
}: LayoutRendererProps) {
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>(initialLayout)

  // Listen to Supabase Realtime for instant, zero-reload updates when Admin edits any div/block
  useEffect(() => {
    try {
      const supabase = createBrowserClient()
      const channel = supabase
        .channel(`cms_layout_${pageSlug}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'page_layouts',
            filter: `page_slug=eq.${pageSlug}`,
          },
          (payload: any) => {
            const next = payload?.new as PageLayout
            if (next && Array.isArray(next.layout_json)) {
              setLayoutNodes(next.layout_json as unknown as LayoutNode[])
            }
          }
        )
        // Also listen for broadcast events from the Admin Studio
        .on('broadcast', { event: 'layout_update' }, (payload: any) => {
          if (payload?.payload?.layout_json && Array.isArray(payload.payload.layout_json)) {
            setLayoutNodes(payload.payload.layout_json as unknown as LayoutNode[])
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.warn('Realtime layout listener error:', err)
    }
  }, [pageSlug])

  // Sync if initialLayout prop changes (e.g. navigation or SSR revalidation)
  useEffect(() => {
    if (initialLayout && Array.isArray(initialLayout) && initialLayout.length > 0) {
      setLayoutNodes(initialLayout)
    }
  }, [initialLayout])

  return (
    <div className="sdui-page-canvas w-full">
      {layoutNodes.map((node) => {
        if (node.isVisible === false) return null
        const Component = COMPONENT_REGISTRY[node.type]
        if (!Component) {
          console.warn(`Unregistered component type in SDUI tree: ${node.type}`)
          return null
        }

        return (
          <Component
            key={node.id}
            node={node}
            context={{ products }}
          />
        )
      })}
    </div>
  )
}
