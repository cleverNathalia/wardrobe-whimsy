import { UserProfile } from '@clerk/nextjs'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Settings</h1>
      <UserProfile routing="hash" />
    </div>
  )
}
