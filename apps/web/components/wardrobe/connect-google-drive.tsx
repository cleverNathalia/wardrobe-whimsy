'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DRIVE_SCOPES } from '@/lib/google-drive-scopes'

export function ConnectGoogleDrive() {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const redirectUrl = `${window.location.origin}/wardrobe`
      const googleAccount = user.externalAccounts.find((a) => a.provider === 'google')

      if (googleAccount) {
        await googleAccount.reauthorize({ additionalScopes: Array.from(DRIVE_SCOPES), redirectUrl })
      } else {
        await user.createExternalAccount({
          strategy: 'oauth_google',
          additionalScopes: Array.from(DRIVE_SCOPES),
          redirectUrl,
        })
      }
    } catch (err) {
      console.error('[connect-google-drive]', err)
      setError('Could not connect Google Drive. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto rounded-xl border border-border bg-muted/40 p-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
        <HardDrive size={20} className="text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-serif text-xl font-medium text-foreground">Connect Google Drive</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Wardrobe Whimsy stores your clothing photos and outfit data in your own Google
          Drive — never on our servers. Connect your Google account to continue.
        </p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button onClick={connect} loading={loading} disabled={!isLoaded}>
        Connect Google Drive
      </Button>
    </div>
  )
}
