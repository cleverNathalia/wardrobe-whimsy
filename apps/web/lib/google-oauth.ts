import { google, type Auth } from 'googleapis'
import { prisma } from './prisma'

type OAuth2Client = Auth.OAuth2Client
type Credentials = Auth.Credentials

/**
 * drive.file is deliberately the only scope. It grants access solely to files
 * and folders this app creates, which is why the app creates the wardrobe
 * folder itself rather than accepting a pasted link. Staying off the broader
 * `drive` scope keeps us out of Google's restricted-scope verification and
 * CASA security assessment entirely.
 */
export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'] as const

/** Holds the CSRF state and post-connect return path across the Google round trip. */
export const OAUTH_STATE_COOKIE = 'ww_google_oauth_state'

const DEFAULT_RETURN_TO = '/wardrobe'

/**
 * Narrows an untrusted `returnTo` down to a same-origin path.
 *
 * Prefix checks are not sufficient here. For http(s) URLs the WHATWG parser
 * treats backslashes as forward slashes, so `/\evil.example` survives a
 * `startsWith('//')` test and still resolves to `https://evil.example` — an
 * open redirect the moment Google hands the user back.
 *
 * Resolving against the app's own origin and comparing is what actually makes
 * this safe; it covers backslashes, protocol-relative URLs and absolute URLs
 * without needing to enumerate them.
 */
export function safeReturnTo(raw: string | null | undefined, base: string): string {
  if (!raw || !raw.startsWith('/')) return DEFAULT_RETURN_TO

  try {
    const appOrigin = new URL(base).origin
    const resolved = new URL(raw, base)

    if (resolved.origin !== appOrigin) return DEFAULT_RETURN_TO

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return DEFAULT_RETURN_TO
  }
}

/**
 * True when Google rejected our refresh token — it expired, was revoked, or the
 * user removed the app's access.
 *
 * This is routine in development: while the OAuth app's publishing status is
 * "Testing", Google expires every refresh token after 7 days. Treat it as
 * "not connected" so the UI offers a reconnect instead of throwing a 500.
 */
export function isInvalidGrantError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const candidate = err as {
    message?: string
    response?: { data?: { error?: string } }
  }

  return (
    candidate.response?.data?.error === 'invalid_grant' ||
    (typeof candidate.message === 'string' && candidate.message.includes('invalid_grant'))
  )
}

export class GoogleNotConnectedError extends Error {
  constructor() {
    super('This user has not connected their Google account')
    this.name = 'GoogleNotConnectedError'
  }
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to apps/web/.env.local — see the Google Drive setup notes in README.md.`,
    )
  }
  return value
}

export function getRedirectUri(): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (explicit) return explicit

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`
}

export function createOAuthClient(): OAuth2Client {
  const clientId = requireEnv(
    'GOOGLE_CLIENT_ID',
    process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  )
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET)

  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri())
}

/**
 * `prompt: 'consent'` is not redundant with `access_type: 'offline'`. Google
 * only returns a refresh token on the first consent for a given client/user
 * pair; without forcing the prompt, a re-connect yields an access token with
 * no refresh token and the user silently breaks an hour later.
 */
export function getConsentUrl(state: string): string {
  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [...DRIVE_SCOPES],
    include_granted_scopes: true,
    state,
  })
}

export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const { tokens } = await createOAuthClient().getToken(code)
  return tokens
}

export async function saveUserTokens(userId: string, tokens: Credentials): Promise<void> {
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token — re-consent with prompt=consent.')
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleRefreshToken: tokens.refresh_token,
      googleScopes: tokens.scope ?? null,
      googleConnectedAt: new Date(),
    },
  })
}

export async function disconnectUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { googleRefreshToken: null, googleScopes: null, googleConnectedAt: null },
  })
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  })
  return Boolean(user?.googleRefreshToken)
}

/**
 * Builds a client that acts as this user. Any file it creates is owned by them
 * and counts against their 15GB — which is the whole reason we are not using a
 * service account, since those have zero quota and cannot create files at all.
 */
export async function getAuthedClientForUser(userId: string): Promise<OAuth2Client> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  })

  if (!user?.googleRefreshToken) {
    throw new GoogleNotConnectedError()
  }

  const client = createOAuthClient()
  client.setCredentials({ refresh_token: user.googleRefreshToken })

  // Google occasionally rotates refresh tokens; persist the new one or the
  // connection dies the next time the old one is used.
  client.on('tokens', (tokens) => {
    if (!tokens.refresh_token) return
    prisma.user
      .update({
        where: { id: userId },
        data: { googleRefreshToken: tokens.refresh_token },
      })
      .catch((err: unknown) => {
        console.error('Failed to persist rotated Google refresh token', err)
      })
  })

  return client
}
