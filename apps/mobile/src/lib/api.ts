import { useCallback } from 'react'
import { useAuth } from '@clerk/expo'

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
if (!BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set. Copy apps/mobile/.env.example to .env.local.')
}

/** The web app hosts the API; paths it returns (like image URLs) are relative to it. */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * fetch() against the web API as the signed-in user. The phone has no session
 * cookie, so Clerk's session token goes in the Authorization header instead —
 * the same Clerk instance as the web app checks it on the other end.
 */
export function useApi() {
  const { getToken } = useAuth()

  return useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken()
      const res = await fetch(apiUrl(path), {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
      }
      return (res.status === 204 ? undefined : await res.json()) as T
    },
    [getToken]
  )
}
