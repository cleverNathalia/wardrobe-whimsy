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

  const auth = await getAuthedClientForUser(wardrobe.userId)
  return { drive: google.drive({ version: 'v3', auth }), folderId: wardrobe.googleFolderId }
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
 * Creates this wardrobe's folder in the user's Drive on first connect and
 * records its id. Under the drive.file scope the app can only ever touch
 * folders it created itself, which is why the folder is created here rather
 * than accepted as a pasted link.
 */
export async function ensureWardrobeFolder(wardrobeId: string, userId: string): Promise<string> {
  const wardrobe = await prisma.wardrobe.findUnique({ where: { id: wardrobeId } })

  if (!wardrobe || wardrobe.userId !== userId) {
    throw new WardrobeNotFoundError()
  }

  if (wardrobe.googleFolderId) {
    return wardrobe.googleFolderId
  }

  const auth = await getAuthedClientForUser(userId)
  const drive = google.drive({ version: 'v3', auth })

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
): Promise<string> {
  const { drive, folderId } = await getDriveForOwner(wardrobeId)

  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'image/jpeg', body: Readable.from(buffer) },
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
