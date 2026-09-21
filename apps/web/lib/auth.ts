import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export interface CurrentUser {
  id: string // Clerk user id (used as the key into that user's own Google Drive)
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
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
 * Thrown when an email already belongs to another row but we cannot prove the
 * signed-in user owns it. Surfaced instead of letting the insert fail with a
 * raw unique-constraint error, which says nothing useful.
 */
export class EmailAlreadyClaimedError extends Error {
  constructor() {
    super('That email address already belongs to another account')
    this.name = 'EmailAlreadyClaimedError'
  }
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

  const clerkUser = await currentUser()
  const primaryEmail = clerkUser?.primaryEmailAddress
  const email =
    primaryEmail?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    // Unique per id, so a user with no email can never collide with anyone.
    `${user.id}@no-email.local`

  const byId = await prisma.user.findUnique({ where: { id: user.id } })

  // Deleting a Clerk account and signing up again gives the same person a new
  // id, while their wardrobe stays attached to the old one. Because `email` is
  // unique, the insert below would then fail on every single request and lock
  // them out of their own data, so move the existing row onto the new id
  // instead. `wardrobes_userId_fkey` is ON UPDATE CASCADE, so everything they
  // own follows the id across.
  //
  // Only reached when there is no row for this id, which is rare — the usual
  // path costs one query, not two.
  const byEmail = byId ? null : await prisma.user.findUnique({ where: { email } })

  if (!byId && byEmail && byEmail.id !== user.id) {
    // Only on a verified address. Without this, signing up with someone else's
    // email would hand over their wardrobe.
    if (primaryEmail?.verification?.status !== 'verified') {
      throw new EmailAlreadyClaimedError()
    }

    // Raw SQL because Prisma will not update a field another relation
    // references, though Postgres does it happily via the cascade.
    await prisma.$executeRaw`UPDATE users SET id = ${user.id} WHERE id = ${byEmail.id}`

    return user.id
  }

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email },
    create: { id: user.id, email },
  })

  return user.id
}
