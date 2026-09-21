import { Readable } from 'node:stream'
import { google, type drive_v3 } from 'googleapis'
import { getAuthedClientForUser, GoogleNotConnectedError } from './google-oauth'
import { prisma } from './prisma'

export { GoogleNotConnectedError }

export class WardrobeNotFoundError extends Error {
  constructor() {
    super('Wardrobe not found or user does not have access')
    this.name = 'WardrobeNotFoundError'
  }
}

export class FolderNotConnectedError extends Error {
  constructor() {
    super('Google Drive folder not connected for this wardrobe')
    this.name = 'FolderNotConnectedError'
  }
}

/**
 * Drive calls are made as the wardrobe's owner, so uploads are owned by them
 * and use their storage quota. Callers that act on behalf of a request must
 * still call validateWardrobeAccess first — this resolves the owner, it does
 * not check that the requester *is* the owner.
 */
async function getDriveForOwner(wardrobeId: string): Promise<{
  drive: drive_v3.Drive
  folderId: string
}> {
  const wardrobe = await prisma.wardrobe.findUnique({ where: { id: wardrobeId } })

  if (!wardrobe) {
    throw new WardrobeNotFoundError()
  }

  if (!wardrobe.googleFolderId) {
    throw new FolderNotConnectedError()
  }

  // Deliberately not `wardrobe.googleFolderId` — this is the path uploads take,
  // and a stored id can point at a folder the user has since binned. Going
  // through ensureWardrobeFolder re-verifies it and substitutes a fresh folder
  // if it has gone, so a photo can never be saved into the bin.
  const folderId = await ensureWardrobeFolder(wardrobeId, wardrobe.userId)

  const auth = await getAuthedClientForUser(wardrobe.userId)
  return { drive: google.drive({ version: 'v3', auth }), folderId }
}

export async function getDriveClientForWardrobe(wardrobeId: string): Promise<drive_v3.Drive> {
  const { drive } = await getDriveForOwner(wardrobeId)
  return drive
}

export async function validateWardrobeAccess(wardrobeId: string, userId: string): Promise<void> {
  const wardrobe = await prisma.wardrobe.findUnique({ where: { id: wardrobeId } })

  if (!wardrobe || wardrobe.userId !== userId) {
    throw new WardrobeNotFoundError()
  }

  if (!wardrobe.googleFolderId) {
    throw new FolderNotConnectedError()
  }
}

/**
 * Whether a stored folder id still points at somewhere we can actually put
 * files: it exists, and it is not sitting in the user's bin.
 *
 * A folder can be deleted or binned from the Drive UI at any time, and the app
 * is never told. Uploading into a binned parent succeeds as far as the API is
 * concerned, so without this check photos keep saving into the bin and simply
 * appear to vanish.
 *
 * Any failure to answer is treated as "unusable" rather than assumed fine —
 * re-creating a folder is cheap and recoverable, writing into a bin is not.
 */
async function folderIsUsable(drive: drive_v3.Drive, folderId: string): Promise<boolean> {
  try {
    const { data } = await drive.files.get({ fileId: folderId, fields: 'trashed' })
    return data.trashed !== true
  } catch {
    return false
  }
}

/**
 * Creates this wardrobe's folder in the user's Drive on first connect and
 * records its id. Under the drive.file scope the app can only ever touch
 * folders it created itself, which is why the folder is created here rather
 * than accepted as a pasted link.
 *
 * A stored id is re-verified before it is trusted, so a folder the user has
 * since binned or deleted is replaced rather than written into.
 */
export async function ensureWardrobeFolder(wardrobeId: string, userId: string): Promise<string> {
  const wardrobe = await prisma.wardrobe.findUnique({ where: { id: wardrobeId } })

  if (!wardrobe || wardrobe.userId !== userId) {
    throw new WardrobeNotFoundError()
  }

  const auth = await getAuthedClientForUser(userId)
  const drive = google.drive({ version: 'v3', auth })

  if (wardrobe.googleFolderId) {
    if (await folderIsUsable(drive, wardrobe.googleFolderId)) {
      return wardrobe.googleFolderId
    }

    // Left as a warning rather than handled silently: the old folder may still
    // be in the bin with the user's photos in it, and only they can decide
    // whether to restore it.
    console.warn(
      `[google-drive] wardrobe ${wardrobeId} pointed at folder ${wardrobe.googleFolderId}, ` +
        'which is missing or in the bin — creating a replacement',
    )
  }

  const created = await drive.files.create({
    requestBody: {
      name: `Wardrobe Whimsy — ${wardrobe.name}`,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })

  const folderId = created.data.id
  if (!folderId) {
    throw new Error('Google Drive did not return an id for the created folder')
  }

  await prisma.wardrobe.update({
    where: { id: wardrobeId },
    data: { googleFolderId: folderId },
  })

  return folderId
}

export async function uploadImage(
  wardrobeId: string,
  buffer: Buffer,
  filename: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const { drive, folderId } = await getDriveForOwner(wardrobeId)

  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id',
  })

  const fileId = created.data.id
  if (!fileId) {
    throw new Error('Google Drive did not return an id for the uploaded file')
  }

  return fileId
}

export async function deleteFile(wardrobeId: string, fileId: string): Promise<void> {
  const { drive } = await getDriveForOwner(wardrobeId)
  await drive.files.delete({ fileId }).catch(() => {})
}

export async function getImageBuffer(
  wardrobeId: string,
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { drive } = await getDriveForOwner(wardrobeId)

  const [meta, res] = await Promise.all([
    drive.files.get({ fileId, fields: 'mimeType' }),
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' }),
  ])

  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? 'image/jpeg',
  }
}
