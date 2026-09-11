import { Prisma } from '@prisma/client'

const DATABASE_ERROR_CODES = new Set([
  'P1000', // Authentication failed
  'P1001', // Database server unreachable
  'P1002', // Database server timed out
  'P1003', // Database does not exist
  'P1008', // Operation timed out
  'P1011', // TLS connection failed
  'P1017', // Server closed the connection
  'P2021', // Expected table does not exist
  'P2022', // Expected column does not exist
])

/**
 * Errors that mean the app's data store is unavailable or has not been
 * initialised yet. Validation and application errors deliberately fall
 * through so they are still visible to developers.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return DATABASE_ERROR_CODES.has(error.code)
  }

  // `instanceof` can fail if a deployment bundles two Prisma runtimes.
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: string; code?: string }

  return (
    candidate.name === 'PrismaClientInitializationError' ||
    (typeof candidate.code === 'string' && DATABASE_ERROR_CODES.has(candidate.code))
  )
}
