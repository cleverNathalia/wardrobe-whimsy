import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Props, not the env fallback, so the hop through /welcome needs no
          change to deployment settings. A redirect_url Clerk was given still
          wins, so returning to a deep link is unaffected. */}
      <SignIn fallbackRedirectUrl="/welcome" signUpFallbackRedirectUrl="/welcome" />
    </div>
  )
}
