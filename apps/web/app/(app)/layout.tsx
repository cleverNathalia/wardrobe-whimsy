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
  if (!googleAccount) {
    console.log('[needsGoogleDriveConnection] no google account found')
    return true
  }

  const isVerified = googleAccount.verification?.status === 'verified'
  console.log('[needsGoogleDriveConnection]', {
    hasGoogleAccount: true,
    isVerified,
    verificationStatus: googleAccount.verification?.status,
  })

  return !isVerified
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
