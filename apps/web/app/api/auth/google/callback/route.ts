import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ensureDbUser } from '@/lib/auth'
import { exchangeCodeForTokens, saveUserTokens, OAUTH_STATE_COOKIE } from '@/lib/google-oauth'

export const runtime = 'nodejs'

function statesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const jar = await cookies()
  const cookieValue = jar.get(OAUTH_STATE_COOKIE)?.value
  jar.delete(OAUTH_STATE_COOKIE)

  const separator = cookieValue?.indexOf('|') ?? -1
  const expectedState = separator > -1 ? cookieValue!.slice(0, separator) : null
  const returnTo = separator > -1 ? cookieValue!.slice(separator + 1) : '/wardrobe'

  const fail = (reason: string) => NextResponse.redirect(new URL(`${returnTo}?google=${reason}`, req.url))

  // The user clicked "Deny" on the consent screen, or Google rejected the request.
  const oauthError = url.searchParams.get('error')
  if (oauthError) {
    return fail(oauthError === 'access_denied' ? 'denied' : 'error')
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state || !expectedState || !statesMatch(state, expectedState)) {
    return fail('invalid_state')
  }

  let userId: string
  try {
    userId = await ensureDbUser()
  } catch {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    await saveUserTokens(userId, tokens)
  } catch (err) {
    console.error('[auth/google/callback]', err)
    return fail('exchange_failed')
  }

  return NextResponse.redirect(new URL(`${returnTo}?google=connected`, req.url))
}
