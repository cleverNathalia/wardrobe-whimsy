'use client'

import { useState, useCallback, useRef } from 'react'
import { AppImage as Image } from '@/components/ui/app-image'
import { Loader2, Image as ImageIcon, AlertCircle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PendingPhoto } from '@/lib/pending-photo'

/** What /api/google-photos/import returns — the thumbnail is preview-only. */
interface ImportResult {
  imageUrl: string
  imageFileId: string
  previewDataUrl: string
}

interface GooglePhotosPickerProps {
  /** Which wardrobe's Drive folder the imported photo lands in. */
  wardrobeId: string
  /** Called with the imported photo, or null when it is cleared. */
  onChange: (pending: PendingPhoto | null) => void
  disabled?: boolean
}

type Phase = 'idle' | 'auth' | 'picker_open' | 'importing' | 'error'

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gis-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 200 // 10 minutes

export function GooglePhotosPicker({ wardrobeId, onChange, disabled }: GooglePhotosPickerProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pickerWindowRef = useRef<Window | null>(null)
  const pollCount = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fail = useCallback(
    (msg: string) => {
      stopPolling()
      setPhase('error')
      setErrorMsg(msg)
    },
    [stopPolling],
  )

  const startPolling = useCallback(
    (sessionId: string, accessToken: string) => {
      pollCount.current = 0
      pollRef.current = setInterval(async () => {
        pollCount.current += 1
        if (pollCount.current > MAX_POLLS) {
          return fail('The picker session timed out. Please try again.')
        }

        try {
          const res = await fetch(
            `/api/google-photos/session/${sessionId}?accessToken=${encodeURIComponent(accessToken)}`,
          )
          if (!res.ok) return fail('Lost connection to Google Photos. Please try again.')

          const data: { mediaItemsSet: boolean; expired: boolean } = await res.json()

          if (data.expired) return fail('The picker session expired. Please try again.')

          if (data.mediaItemsSet) {
            stopPolling()
            setPhase('importing')
            try {
              const importRes = await fetch('/api/google-photos/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, accessToken, wardrobeId }),
              })
              if (!importRes.ok) {
                const err = await importRes.json().catch(() => ({}))
                return fail((err as { error?: string }).error ?? 'Failed to import photo.')
              }
              const result: ImportResult = await importRes.json()

              // Preview from the inline thumbnail, not result.imageUrl: the
              // proxy route 404s until the form is submitted and a row exists.
              setPreview(result.previewDataUrl)
              onChange({
                kind: 'uploaded',
                imageFileId: result.imageFileId,
                imageUrl: result.imageUrl,
                previewUrl: result.previewDataUrl,
              })
              setPhase('idle')
            } catch {
              fail('Failed to import photo. Please try again.')
            }
            return
          }

        } catch (e) {
          console.error('[GP poll] exception', e)
          fail('Lost connection. Please try again.')
        }
      }, POLL_INTERVAL_MS)
    },
    [stopPolling, fail, onChange, wardrobeId],
  )

  const handleClick = useCallback(async () => {
    setPhase('auth')
    setErrorMsg(null)

    // Open the popup synchronously while we still have the user gesture,
    // otherwise browsers block it as an unsolicited popup.
    const popup = window.open('about:blank', 'google-photos-picker', 'width=600,height=700,left=200,top=100')
    pickerWindowRef.current = popup

    try {
      await loadGisScript()
    } catch {
      popup?.close()
      return fail('Failed to load Google sign-in. Check your connection and try again.')
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      popup?.close()
      return fail('Google Photos is not configured.')
    }

    window.google!.accounts.oauth2
      .initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            popup?.close()
            return fail('Google sign-in was cancelled or failed.')
          }

          const accessToken = tokenResponse.access_token

          try {
            const res = await fetch('/api/google-photos/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            })
            if (!res.ok) {
              popup?.close()
              return fail('Could not start a Google Photos session.')
            }

            const { sessionId, pickerUri }: { sessionId: string; pickerUri: string } = await res.json()

            // Navigate the already-open popup to the picker URL
            if (pickerWindowRef.current) {
              pickerWindowRef.current.location.href = pickerUri
            } else {
              return fail('The picker window was closed. Please try again.')
            }
            setPhase('picker_open')
            startPolling(sessionId, accessToken)
          } catch {
            popup?.close()
            fail('Could not connect to Google Photos. Please try again.')
          }
        },
        error_callback: () => {
          popup?.close()
          fail('Google sign-in was cancelled.')
        },
      })
      .requestAccessToken({ prompt: 'consent' })
  }, [fail, startPolling])

  if (preview && phase === 'idle') {
    return (
      <div className="relative aspect-square w-full max-w-sm rounded-xl overflow-hidden border border-border bg-muted">
        <Image src={preview} alt="Selected photo" fill className="object-cover" sizes="400px" />
        <button
          type="button"
          onClick={() => {
            setPreview(null)
            onChange(null)
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-destructive/40 bg-destructive/5">
        <AlertCircle size={20} className="text-destructive" />
        <p className="text-sm text-destructive text-center px-6">{errorMsg}</p>
        <Button size="sm" variant="outline" onClick={() => { setPhase('idle'); setErrorMsg(null) }}>
          <RefreshCw size={14} className="mr-1.5" />
          Try again
        </Button>
      </div>
    )
  }

  if (phase === 'picker_open') {
    return (
      <div className="aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
        <Loader2 size={20} className="animate-spin text-primary" />
        <div className="text-center px-6">
          <p className="text-sm font-medium text-foreground">Select a photo in Google Photos</p>
          <p className="text-xs text-muted-foreground mt-1">The picker opened in a new window. Come back here once you&apos;ve chosen.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => { stopPolling(); setPhase('idle') }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (phase === 'importing') {
    return (
      <div className="aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30">
        <Loader2 size={20} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Importing your photo…</p>
      </div>
    )
  }

  // idle or auth
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || phase === 'auth'}
      className="aspect-square w-full max-w-sm flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {phase === 'auth' ? (
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <ImageIcon size={20} className="text-muted-foreground" />
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {phase === 'auth' ? 'Connecting to Google…' : 'Import from Google Photos'}
        </p>
        {phase === 'idle' && (
          <p className="text-xs text-muted-foreground mt-1">Opens Google Photos in a new tab</p>
        )}
      </div>
    </button>
  )
}
