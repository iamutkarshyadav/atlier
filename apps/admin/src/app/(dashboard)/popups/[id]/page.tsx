'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PopupStudioEditor } from '@/components/popups/PopupStudioEditor'
import { Loader2, AlertCircle } from 'lucide-react'
import type { PopupCampaign } from '@repo/supabase'

export default function EditPopupPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [popup, setPopup] = useState<PopupCampaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchCampaign = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/popups/${id}`)
        const data = await res.json()
        if (data.success && data.popup) {
          setPopup(data.popup)
        } else {
          setError(data.error || 'Popup campaign not found')
        }
      } catch {
        setError('Network error loading popup campaign')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaign()
  }, [id])

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-foreground" />
        <p>Loading Pop-Up Studio Campaign...</p>
      </div>
    )
  }

  if (error || !popup) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-sm text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error || 'Campaign not found'}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push('/popups')}
          className="px-4 py-2 bg-chrome-850 hover:bg-chrome-800 text-foreground border border-chrome-750 dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold rounded-xs transition-colors"
        >
          Return to Pop-Up Studio
        </button>
      </div>
    )
  }

  return <PopupStudioEditor initialData={popup} isEditing={true} />
}
