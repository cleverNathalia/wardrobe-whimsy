import sharp from 'sharp'
import { uploadImage } from './google-drive'

const MAX_EDGE = 1600
const QUALITY = 85

/**
 * Stores an image in the wardrobe's Drive folder, re-encoded and resized.
 *
 * Transparent images are kept as WebP rather than JPEG: JPEG has no alpha
 * channel, so a background-removed cut-out would be flattened to black. WebP
 * keeps transparency and is smaller than PNG, which matters because these
 * count against the user's own Drive quota.
 */
export async function resizeAndUploadImage(
  wardrobeId: string,
  originalBuffer: Buffer,
): Promise<{ imageFileId: string; imageUrl: string }> {
  const { hasAlpha } = await sharp(originalBuffer).metadata()

  const resized = () =>
    sharp(originalBuffer).rotate().resize(MAX_EDGE, MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })

  const { buffer, extension, mimeType } = hasAlpha
    ? {
        buffer: await resized().webp({ quality: QUALITY }).toBuffer(),
        extension: 'webp',
        mimeType: 'image/webp',
      }
    : {
        buffer: await resized().jpeg({ quality: QUALITY }).toBuffer(),
        extension: 'jpg',
        mimeType: 'image/jpeg',
      }

  const imageFileId = await uploadImage(wardrobeId, buffer, `${Date.now()}.${extension}`, mimeType)

  return { imageFileId, imageUrl: `/api/drive/image/${imageFileId}` }
}
