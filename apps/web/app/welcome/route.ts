import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isGoogleLoginWorking } from '@/lib/google-oauth'

export const runtime = 'nodejs'

/**
 * Where sign-in and sign-up land. A user whose Drive is not connected, or
 * whose saved Google login has stopped working, goes straight to Google's
 * consent screen instead of having to find the Connect button. Coming back,
 * the wardrobe page creates their folder on its own.
 *
 * Everyone else carries on to the dashboard, as before this step existed.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/sign-in', req.url))

  // If the check itself fails — the database or Google is unreachable — the
  // dashboard handles that better than an OAuth round trip that cannot finish.
  const connected = await isGoogleLoginWorking(user.id).catch((err: unknown) => {
    console.error('[welcome] Could not check the Google login', err)
    return true
  })

  const destination = connected ? '/dashboard' : '/api/auth/google/start?returnTo=/wardrobe'
  return NextResponse.redirect(new URL(destination, req.url))
}
