import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * Returns the app-level User row for the current request.
 * Creates the row on first access if the webhook hasn't fired yet.
 * Works for both web sessions (Clerk cookie) and mobile Bearer tokens.
 * Returns null if unauthenticated.
 */
export async function getCurrentUser() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const existing = await prisma.user.findUnique({ where: { clerkId } })
  if (existing) return existing

  // Lazily create the user row if the webhook hasn't fired yet.
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
  if (!email) return null

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, name, image: clerkUser.imageUrl },
    update: {},
  })
}

/**
 * Like getCurrentUser but throws a 401 response if not authenticated.
 * Use inside Route Handlers.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return user
}
