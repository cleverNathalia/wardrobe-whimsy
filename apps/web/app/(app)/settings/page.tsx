import Link from 'next/link'
import { UserProfile } from '@clerk/nextjs'
import { IS_DEMO_MODE } from '@/lib/demo'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Settings</h1>
      {IS_DEMO_MODE ? (
        <div className="max-w-md rounded-xl border border-border bg-muted/40 p-8 text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Settings are unavailable in demo mode. Sign in with your own account to manage your profile.
          </p>
          <Button asChild size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      ) : (
        <UserProfile routing="hash" />
      )}
    </div>
  )
}
