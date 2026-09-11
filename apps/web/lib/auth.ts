import { auth, currentUser } from '@clerk/nextjs/server'
import { IS_DEMO_MODE, DEMO_USER } from '@/lib/demo'
import { prisma } from '@/lib/prisma'

export interface CurrentUser {
  id: string // Clerk user id (used as the key into that user's own Google Drive)
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (IS_DEMO_MODE) return DEMO_USER

  const { userId } = await auth()
  if (!userId) return null

  return { id: userId }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return user
}

/**
 * Guarantees a row exists in `users` for the signed-in Clerk user, so writes
 * that reference it by foreign key (wardrobes, OAuth tokens) cannot fail.
 *
 * Clerk is the source of truth for identity; this table only mirrors the id and
 * email. The `user.created` webhook that used to do this was removed in the
 * service-account refactor, so callers that write user-owned rows must call
 * this first.
 */
export async function ensureDbUser(): Promise<string> {
  const user = await requireUser()
  if (IS_DEMO_MODE) return user.id

  const clerkUser = await currentUser()
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    `${user.id}@no-email.local`

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email },
    create: { id: user.id, email },
  })

  return user.id
}
