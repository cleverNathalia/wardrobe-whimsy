import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* See the sign-in page: /welcome connects Drive straight after sign-up. */}
      <SignUp fallbackRedirectUrl="/welcome" signInFallbackRedirectUrl="/welcome" />
    </div>
  )
}
