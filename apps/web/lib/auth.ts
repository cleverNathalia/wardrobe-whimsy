import { auth } from '@clerk/nextjs/server'
import { IS_DEMO_MODE, DEMO_USER } from '@/lib/demo'

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
