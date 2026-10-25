import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}))
vi.mock('./prisma', () => ({ prisma: db }))

/** Stands in for Google's token endpoint: the only network call under test. */
const getAccessToken = vi.hoisted(() => vi.fn())
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials() {}
        on() {}
        getAccessToken = getAccessToken
      },
    },
  },
}))

import {
  GoogleNotConnectedError,
  getAuthedClientForUser,
  isGoogleLoginWorking,
  isInvalidGrantError,
  safeReturnTo,
} from './google-oauth'

const invalidGrant = Object.assign(new Error('invalid_grant'), {
  response: { data: { error: 'invalid_grant' } },
})

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret')
  db.user.findUnique.mockResolvedValue({ googleRefreshToken: 'saved-token' })
  db.user.updateMany.mockResolvedValue({ count: 1 })
  getAccessToken.mockResolvedValue({ token: 'access-token' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('safeReturnTo', () => {
  const base = 'https://app.example/api/auth/google/start'

  it('keeps a same-origin path, with its query and hash', () => {
    expect(safeReturnTo('/wardrobe/new?google=connected#photo', base)).toBe('/wardrobe/new?google=connected#photo')
  })

  it.each([
    ['nothing', null],
    ['a relative path', 'wardrobe'],
    ['an absolute URL', 'https://evil.example/steal'],
    ['a protocol-relative URL', '//evil.example'],
    // Browsers treat the backslash as a slash, so this is also another site.
    ['a backslash trick', '/\\evil.example'],
  ])('falls back to /wardrobe for %s', (_label, raw) => {
    expect(safeReturnTo(raw, base)).toBe('/wardrobe')
  })
})

describe('isInvalidGrantError', () => {
  it("recognises Google's rejection in either shape it arrives in", () => {
    expect(isInvalidGrantError(invalidGrant)).toBe(true)
    expect(isInvalidGrantError(new Error('invalid_grant: Token has been expired or revoked.'))).toBe(true)
  })

  it('does not mistake other failures for it', () => {
    expect(isInvalidGrantError(new Error('ETIMEDOUT'))).toBe(false)
    expect(isInvalidGrantError(null)).toBe(false)
    expect(isInvalidGrantError('invalid_grant')).toBe(false)
  })
})

describe('getAuthedClientForUser', () => {
  it('returns a client when Google accepts the saved login', async () => {
    await expect(getAuthedClientForUser('user-1')).resolves.toBeDefined()
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('reports not connected when no login is saved', async () => {
    db.user.findUnique.mockResolvedValue({ googleRefreshToken: null })
    await expect(getAuthedClientForUser('user-1')).rejects.toBeInstanceOf(GoogleNotConnectedError)
    expect(getAccessToken).not.toHaveBeenCalled()
  })

  it('forgets a rejected login — but only if it is still the one that failed', async () => {
    getAccessToken.mockRejectedValue(invalidGrant)

    await expect(getAuthedClientForUser('user-1')).rejects.toBeInstanceOf(GoogleNotConnectedError)

    // Matching on the old token is what stops a reconnect that landed
    // mid-request from being wiped out.
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', googleRefreshToken: 'saved-token' },
      data: { googleRefreshToken: null, googleScopes: null, googleConnectedAt: null },
    })
  })

  it('keeps the login when Google is merely unreachable', async () => {
    const outage = new Error('ETIMEDOUT')
    getAccessToken.mockRejectedValue(outage)

    await expect(getAuthedClientForUser('user-1')).rejects.toBe(outage)
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })
})

describe('isGoogleLoginWorking', () => {
  it('is false for a rejected login and true for a good one', async () => {
    await expect(isGoogleLoginWorking('user-1')).resolves.toBe(true)

    getAccessToken.mockRejectedValue(invalidGrant)
    await expect(isGoogleLoginWorking('user-1')).resolves.toBe(false)
  })

  it('lets other failures through for the caller to decide', async () => {
    getAccessToken.mockRejectedValue(new Error('ETIMEDOUT'))
    await expect(isGoogleLoginWorking('user-1')).rejects.toThrow('ETIMEDOUT')
  })
})
