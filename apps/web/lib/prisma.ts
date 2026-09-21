import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

/**
 * Neon suspends an idle compute and only resumes it when something connects.
 * That resume regularly takes 8–10 seconds, well past Prisma's 5 second
 * default, so the first request after a quiet spell fails with P1001 —
 * "Can't reach database server" — even though nothing is wrong.
 *
 * Widening the window here rather than in `.env` keeps every environment
 * consistent, including Vercel, and leaves the connection string itself alone.
 * An explicit `connect_timeout` in the URL still wins.
 */
const CONNECT_TIMEOUT_SECONDS = '30'

function withConnectTimeout(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl) return databaseUrl

  try {
    const url = new URL(databaseUrl)
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', CONNECT_TIMEOUT_SECONDS)
    }
    return url.toString()
  } catch {
    // A malformed URL is Prisma's problem to report, not something to mask here.
    return databaseUrl
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: withConnectTimeout(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
