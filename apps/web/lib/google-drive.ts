import { Readable } from 'node:stream'
import type { drive_v3 } from 'googleapis'
import { getServiceAccountDriveClient } from './google-drive-service-account'
import { prisma } from './prisma'

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

export async function getDriveClientForWardrobe(wardrobeId: string): Promise<drive_v3.Drive> {
  const wardrobe = await prisma.wardrobe.findUnique({
    where: { id: wardrobeId },
  })

  if (!wardrobe) {
    throw new WardrobeNotFoundError()
  }

  if (!wardrobe.googleFolderId) {
    throw new FolderNotConnectedError()
  }

  return getServiceAccountDriveClient()
}

export async function validateWardrobeAccess(wardrobeId: string, userId: string): Promise<void> {
  const wardrobe = await prisma.wardrobe.findUnique({
    where: { id: wardrobeId },
  })

  if (!wardrobe || wardrobe.userId !== userId) {
    throw new WardrobeNotFoundError()
  }

  if (!wardrobe.googleFolderId) {
    throw new FolderNotConnectedError()
  }
}

export async function uploadImage(
  wardrobeId: string,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const drive = await getDriveClientForWardrobe(wardrobeId)
  const wardrobe = await prisma.wardrobe.findUnique({
    where: { id: wardrobeId },
  })

  if (!wardrobe) throw new WardrobeNotFoundError()

  const created = await drive.files.create({
    requestBody: { name: filename, parents: [wardrobe.googleFolderId] },
    media: { mimeType: 'image/jpeg', body: Readable.from(buffer) },
    fields: 'id',
  })

  return created.data.id!
}

export async function deleteFile(wardrobeId: string, fileId: string): Promise<void> {
  const drive = await getDriveClientForWardrobe(wardrobeId)
  await drive.files.delete({ fileId }).catch(() => {})
}

export async function getImageBuffer(
  wardrobeId: string,
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = await getDriveClientForWardrobe(wardrobeId)

  const [meta, res] = await Promise.all([
    drive.files.get({ fileId, fields: 'mimeType' }),
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' }),
  ])

  return { buffer: Buffer.from(res.data as ArrayBuffer), mimeType: meta.data.mimeType ?? 'image/jpeg' }
}
