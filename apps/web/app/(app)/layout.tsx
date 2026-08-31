import { currentUser } from '@clerk/nextjs/server'
import { Sidebar } from '@/components/shell/sidebar'
import { BottomNav } from '@/components/shell/bottom-nav'
import { DemoBanner } from '@/components/shell/demo-banner'
import { ConnectGoogleDrive } from '@/components/wardrobe/connect-google-drive'
import { IS_DEMO_MODE } from '@/lib/demo'
import { DRIVE_SCOPES } from '@/lib/google-drive-scopes'

async function needsGoogleDriveConnection(): Promise<boolean> {
  if (IS_DEMO_MODE) return false

  const user = await currentUser()
  if (!user) return false

  const googleAccount = user.externalAccounts.find((a) => a.provider === 'google')
  if (!googleAccount) return true

  const grantedScopes = new Set(
    googleAccount.approvedScopes
      .split(' ')
      .filter(Boolean)
      .map((s) => s.trim())
  )

  const hasAllScopes = DRIVE_SCOPES.every((scope) => grantedScopes.has(scope))
  const logData = {
    grantedScopes: Array.from(grantedScopes),
    requiredScopes: Array.from(DRIVE_SCOPES),
    hasAllScopes,
    approvedScopesRaw: googleAccount.approvedScopes,
  }
  console.log('[needsGoogleDriveConnection]', logData)

  if (typeof window !== 'undefined') {
    localStorage.setItem('[needsGoogleDriveConnection]', JSON.stringify(logData))
  }

  return !hasAllScopes
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const needsConnect = await needsGoogleDriveConnection()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isDemoMode={IS_DEMO_MODE} />
      <main className="lg:pl-62 pb-[var(--touch-target)] lg:pb-0">
        {IS_DEMO_MODE && <DemoBanner />}
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {needsConnect ? <ConnectGoogleDrive /> : children}
        </div>
      </main>
      <BottomNav isDemoMode={IS_DEMO_MODE} />
    </div>
  )
}
