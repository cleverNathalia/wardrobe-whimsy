import { UserProfile } from '@clerk/nextjs'
import { GoogleDriveSettings } from '@/components/settings/google-drive-settings'

type SettingsPageProps = { searchParams: Promise<{ google?: string }> }

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  // Set by the OAuth callback when a reconnect started from this page returns.
  const { google: googleStatus } = await searchParams

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl font-medium text-foreground">Settings</h1>
      <GoogleDriveSettings googleStatus={googleStatus} />
      <UserProfile routing="hash" />
    </div>
  )
}
