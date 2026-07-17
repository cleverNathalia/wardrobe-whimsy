import { v2 as cloudinary } from 'cloudinary'

export const HAS_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

export function generateUploadSignature(folder = 'wardrobe-whimsy') {
  const timestamp = Math.round(Date.now() / 1000)
  const params = { folder, timestamp }
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!)
  return {
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
  }
}

export async function deleteCloudinaryAsset(publicId: string) {
  return cloudinary.uploader.destroy(publicId)
}

export async function uploadFromBuffer(
  buffer: Buffer,
  folder = 'wardrobe-whimsy',
): Promise<{ imageUrl: string; imagePublicId: string }> {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'image' }, (err, res) =>
        err || !res ? reject(err ?? new Error('No result')) : resolve(res),
      )
      .end(buffer)
  })
  return { imageUrl: result.secure_url, imagePublicId: result.public_id }
}
