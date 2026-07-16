import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'
import { IS_DEMO_MODE } from '@/lib/demo'
import { Button } from '@/components/ui/button'

export default function SignUpPage() {
  if (IS_DEMO_MODE) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">You&apos;re in demo mode</h1>
            <p className="text-muted-foreground text-sm">
              To create an account, add your Clerk keys to{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code> and restart the server.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/wardrobe">Continue browsing demo</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp />
    </div>
  )
}
