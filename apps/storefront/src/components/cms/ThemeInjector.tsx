'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@repo/supabase/browser'
import type { StorefrontTokens } from '@repo/supabase/utils'

interface ThemeInjectorProps {
  initialTokens?: Record<string, string>
}

export function ThemeInjector({ initialTokens = {} }: ThemeInjectorProps) {
  const [tokens, setTokens] = useState<Record<string, string>>(initialTokens)

  useEffect(() => {
    try {
      const supabase = createBrowserClient()
      const channel = supabase
        .channel('cms_storefront_tokens')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'storefront_tokens',
            filter: 'theme_name=eq.default',
          },
          (payload: any) => {
            const next = payload?.new as StorefrontTokens
            if (next && next.tokens_json && typeof next.tokens_json === 'object') {
              setTokens(next.tokens_json as Record<string, string>)
            }
          }
        )
        .on('broadcast', { event: 'tokens_update' }, (payload: any) => {
          if (payload?.payload && typeof payload.payload === 'object') {
            setTokens(payload.payload)
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.warn('Realtime tokens listener error:', err)
    }
  }, [])

  const cssDeclarations = React.useMemo(() => {
    return Object.entries(tokens)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join('\n')
  }, [tokens])

  if (!cssDeclarations) return null

  return (
    <style
      id="dynamic-storefront-tokens"
      dangerouslySetInnerHTML={{
        __html: `:root, html {\n${cssDeclarations}\n}`,
      }}
    />
  )
}

