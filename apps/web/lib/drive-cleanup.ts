import { google } from 'googleapis'
import { getAuthedClientForUser } from './google-oauth'
import { prisma } from './prisma'

/**
 * How long a file is left alone before it counts as abandoned.
 *
 * Uploads happen the moment a photo is chosen, but the row that references the
 * file is only written when the form is submitted — so a file with no row is
 * normal for as long as someone is still filling the form in.
 */
const DEFAULT_GRACE_MS = 60 * 60 * 1000

/**
 * Deletes files in a wardrobe's Drive folder that nothing in the database
 * references.
 *
 * This is safe specifically because of the `drive.file` scope: it exposes only
 * files this app created, so anything the user put in the folder themselves is
 * invisible here and cannot be listed, let alone deleted.
 *
 * Returns the number of files moved to the bin.
 */
export async function purgeOrphanedFiles(
  wardrobeId: string,
  { graceMs = DEFAULT_GRACE_MS }: { graceMs?: number } = {},
): Promise<number> {
  const wardrobe = await prisma.wardrobe.findUnique({ where: { id: wardrobeId } })
  if (!wardrobe?.googleFolderId) return 0

  const [items, outfits] = await Promise.all([
    prisma.clothingItem.findMany({ where: { wardrobeId }, select: { imageFileId: true } }),
    prisma.outfit.findMany({
      where: { wardrobeId, coverImageFileId: { not: null } },
      select: { coverImageFileId: true },
    }),
  ])

  const referenced = new Set<string>()
  for (const item of items) referenced.add(item.imageFileId)
  for (const outfit of outfits) {
    if (outfit.coverImageFileId) referenced.add(outfit.coverImageFileId)
  }

  const auth = await getAuthedClientForUser(wardrobe.userId)
  const drive = google.drive({ version: 'v3', auth })

  const cutoff = Date.now() - graceMs
  let deleted = 0
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: `'${wardrobe.googleFolderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, createdTime)',
      pageSize: 100,
      pageToken,
    })

    for (const file of res.data.files ?? []) {
      if (!file.id || referenced.has(file.id)) continue
      if (file.createdTime && new Date(file.createdTime).getTime() > cutoff) continue

      try {
        // Trashed, not permanently deleted. This runs automatically with no
        // user confirming anything, so it stays recoverable from Drive's bin
        // for 30 days if the reachability logic is ever wrong.
        await drive.files.update({ fileId: file.id, requestBody: { trashed: true } })
        deleted += 1
      } catch (err) {
        // One undeletable file must not abort the rest of the sweep.
        console.error(`[drive-cleanup] could not trash ${file.id}`, err)
      }
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return deleted
}

/**
 * Runs a sweep without ever disturbing the caller — cleanup failing is never a
 * reason to fail the upload that triggered it.
 */
export async function purgeOrphanedFilesQuietly(wardrobeId: string): Promise<void> {
  try {
    const deleted = await purgeOrphanedFiles(wardrobeId)
    if (deleted > 0) {
      console.info(`[drive-cleanup] binned ${deleted} orphaned file(s) from wardrobe ${wardrobeId}`)
    }
  } catch (err) {
    console.error('[drive-cleanup] sweep failed', err)
  }
}
