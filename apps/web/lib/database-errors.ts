import { Prisma } from '@prisma/client'

const DATABASE_ERROR_CODES = new Set([
  'P1001', // Database server unreachable
  'P1002', // Database server timed out
  'P1008', // Operation timed out
  'P1011', // TLS connection failed
  'P1017', // Server closed the connection
  'P2024', // Timed out fetching a connection from the pool
])

/**
 * Transient errors that mean the app's data store is temporarily unavailable.
 * Configuration, schema, validation, and application errors deliberately fall
 * through so they remain visible to developers.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.errorCode ? DATABASE_ERROR_CODES.has(error.errorCode) : true
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return DATABASE_ERROR_CODES.has(error.code)
  }

  // `instanceof` can fail if a deployment bundles two Prisma runtimes.
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: string; code?: string; errorCode?: string }

  const code = candidate.code ?? candidate.errorCode
  if (code) return DATABASE_ERROR_CODES.has(code)

  return candidate.name === 'PrismaClientInitializationError'
}
