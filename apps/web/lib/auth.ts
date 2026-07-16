import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { IS_DEMO_MODE, DEMO_USER } from '@/lib/demo'

export async function getCurrentUser() {
  if (IS_DEMO_MODE) return DEMO_USER

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

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return user
}
