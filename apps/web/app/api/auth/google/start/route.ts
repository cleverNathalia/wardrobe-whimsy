import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { requireUser } from '@/lib/auth'
import { getConsentUrl, OAUTH_STATE_COOKIE, safeReturnTo } from '@/lib/google-oauth'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Normalised before it is stored, so the cookie can only ever carry a
  // same-origin path.
  const returnTo = safeReturnTo(new URL(req.url).searchParams.get('returnTo'), req.url)
  const state = randomBytes(32).toString('hex')

  const jar = await cookies()
  jar.set(OAUTH_STATE_COOKIE, `${state}|${returnTo}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 'lax' (not 'strict') so the cookie is still sent on the top-level
    // redirect back from accounts.google.com.
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  let consentUrl: string
  try {
    consentUrl = getConsentUrl(state, await googleLoginHint())
  } catch (err) {
    console.error('[auth/google/start]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Google OAuth is not configured' },
      { status: 500 },
    )
  }

  return NextResponse.redirect(consentUrl)
}

/**
 * The Google account the user signed in to Clerk with, falling back to their
 * primary email. Only a hint: Google still lets them pick another account.
 */
async function googleLoginHint(): Promise<string | undefined> {
  const user = await currentUser()
  const google = user?.externalAccounts.find((account) => account.provider.includes('google'))
  return google?.emailAddress || user?.primaryEmailAddress?.emailAddress || undefined
}
