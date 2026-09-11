'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConnectGoogleDriveProps {
  wardrobeId: string
  /** Whether this user has already granted Drive access. */
  isGoogleConnected: boolean
  /** The `?google=` value the OAuth callback redirected back with, if any. */
  googleStatus?: string
}

const STATUS_MESSAGES: Record<string, string> = {
  denied: 'You declined access. Wardrobe Whimsy needs permission to create its folder in your Drive.',
  invalid_state: 'That sign-in link expired. Please try connecting again.',
  exchange_failed: 'Google rejected the connection. Please try again.',
  error: 'Something went wrong talking to Google. Please try again.',
}

export function ConnectGoogleDrive({
  wardrobeId,
  isGoogleConnected,
  googleStatus,
}: ConnectGoogleDriveProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(
    googleStatus && googleStatus !== 'connected' ? (STATUS_MESSAGES[googleStatus] ?? STATUS_MESSAGES.error) : null,
  )
  const [loading, setLoading] = useState(false)
  const attempted = useRef(false)

  const createFolder = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/wardrobes/${wardrobeId}/connect`, { method: 'POST' })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'GOOGLE_NOT_CONNECTED') {
          window.location.href = `/api/auth/google/start?returnTo=/wardrobe`
          return
        }
        throw new Error(data.error ?? 'Could not create your wardrobe folder')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your wardrobe folder')
      setLoading(false)
    }
  }, [wardrobeId, router])

  // Returning from a successful consent, the only thing left is creating the
  // folder — do it without making the user click a second button.
  useEffect(() => {
    if (googleStatus === 'connected' && isGoogleConnected && !attempted.current) {
      attempted.current = true
      void createFolder()
    }
  }, [googleStatus, isGoogleConnected, createFolder])

  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-muted/40 p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
        <HardDrive size={20} className="text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-serif text-xl font-medium text-foreground">Connect Google Drive</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          We&apos;ll create a folder called <strong>Wardrobe Whimsy</strong> in your Google Drive and keep your
          photos there. They stay in your Drive, owned by you — not on our servers.
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isGoogleConnected ? (
        <Button onClick={createFolder} loading={loading} disabled={loading} className="w-full">
          Create my wardrobe folder
        </Button>
      ) : (
        <Button asChild className="w-full">
          <a href="/api/auth/google/start?returnTo=/wardrobe">Connect Google Drive</a>
        </Button>
      )}

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          We only ask for access to files this app creates — we can&apos;t see anything else in your Drive.
        </p>
      </div>
    </div>
  )
}
