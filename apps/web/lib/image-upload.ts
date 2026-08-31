import sharp from 'sharp'
import { getDriveClient, readIndex, writeIndex, ensurePhotosFolder, uploadImage } from './google-drive'

export async function resizeAndUploadImage(
  clerkUserId: string,
  originalBuffer: Buffer,
): Promise<{ imageFileId: string; imageUrl: string }> {
  const buffer = await sharp(originalBuffer)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  const drive = await getDriveClient(clerkUserId)
  const { fileId, index } = await readIndex(drive)
  const folderId = await ensurePhotosFolder(drive, index)
  const imageFileId = await uploadImage(drive, folderId, buffer, `${Date.now()}.jpg`)
  await writeIndex(drive, fileId, index)

  return { imageFileId, imageUrl: `/api/drive/image/${imageFileId}` }
}
