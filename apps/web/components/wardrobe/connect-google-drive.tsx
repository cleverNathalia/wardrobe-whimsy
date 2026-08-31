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
      const googleAccount = user.externalAccounts.find((a) => a.provider === 'google')

      console.log('[connect-google-drive] starting OAuth flow', { hasGoogleAccount: !!googleAccount })

      let result: any
      if (googleAccount) {
        console.log('[connect-google-drive] reauthorizing existing account')
        result = await googleAccount.reauthorize({
          additionalScopes: Array.from(DRIVE_SCOPES),
        })
      } else {
        console.log('[connect-google-drive] creating new Google account')
        result = await user.createExternalAccount({
          strategy: 'oauth_google',
          additionalScopes: Array.from(DRIVE_SCOPES),
        })
      }

      console.log('[connect-google-drive] OAuth completed, result:', result)

      if (result?.verification?.externalVerificationRedirectURL) {
        console.log('[connect-google-drive] redirecting to verification URL')
        window.location.href = result.verification.externalVerificationRedirectURL
      } else {
        console.log('[connect-google-drive] no verification redirect, reloading page')
        await user.reload()
        window.location.href = '/wardrobe'
      }
    } catch (err) {
      console.error('[connect-google-drive] error:', err)
      const message = err instanceof Error ? err.message : 'Could not connect Google Drive. Please try again.'
      setError(message)
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
