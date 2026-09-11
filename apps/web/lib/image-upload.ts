import sharp from 'sharp'
import { uploadImage } from './google-drive'

export async function resizeAndUploadImage(
  wardrobeId: string,
  originalBuffer: Buffer,
): Promise<{ imageFileId: string; imageUrl: string }> {
  const buffer = await sharp(originalBuffer)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  const imageFileId = await uploadImage(wardrobeId, buffer, `${Date.now()}.jpg`)
  return { imageFileId, imageUrl: `/api/drive/image/${imageFileId}` }
}
