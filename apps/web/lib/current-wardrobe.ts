import { ensureDbUser } from './auth'
import { getOrCreateDefaultWardrobe } from './wardrobe-db'

/**
 * Resolves the signed-in user's default wardrobe, creating the `users` row and
 * the wardrobe if this is their first visit.
 *
 * Every wardrobe-scoped query needs a wardrobeId, and the app is currently
 * single-wardrobe in the UI, so this is the one place that decides which one.
 * Not safe to call in demo mode — demo never touches the database.
 */
export async function requireDefaultWardrobe(): Promise<{
  userId: string
  wardrobeId: string
  googleFolderId: string | null
}> {
  const userId = await ensureDbUser()
  const wardrobe = await getOrCreateDefaultWardrobe(userId)

  return { userId, wardrobeId: wardrobe.id, googleFolderId: wardrobe.googleFolderId }
}
