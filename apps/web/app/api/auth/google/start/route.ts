import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth'
import { getConsentUrl, OAUTH_STATE_COOKIE } from '@/lib/google-oauth'

export const runtime = 'nodejs'

/** Only same-origin relative paths, so the state cookie can't drive an open redirect. */
function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/wardrobe'
  return raw
}

export async function GET(req: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const returnTo = safeReturnTo(new URL(req.url).searchParams.get('returnTo'))
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
    consentUrl = getConsentUrl(state)
  } catch (err) {
    console.error('[auth/google/start]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Google OAuth is not configured' },
      { status: 500 },
    )
  }

  return NextResponse.redirect(consentUrl)
}
