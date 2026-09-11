import sharp from 'sharp'
import { resizeAndUploadImage } from '@/lib/image-upload'

const BASE = 'https://photospicker.googleapis.com/v1'

function headers(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

export interface PickerSession {
  id: string
  pickerUri: string
  mediaItemsSet: boolean
  expireTime: string
}

export async function createPickerSession(accessToken: string): Promise<PickerSession> {
  const res = await fetch(`${BASE}/sessions`, { method: 'POST', headers: headers(accessToken) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Photos session error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function pollPickerSession(sessionId: string, accessToken: string): Promise<PickerSession> {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, { headers: headers(accessToken) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Photos poll error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function importFirstMediaItem(
  sessionId: string,
  accessToken: string,
  wardrobeId: string,
): Promise<{ imageUrl: string; imageFileId: string; previewDataUrl: string }> {
  const res = await fetch(`${BASE}/mediaItems?sessionId=${sessionId}`, { headers: headers(accessToken) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Photos mediaItems error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const items: { mediaFile?: { baseUrl?: string } }[] = data.mediaItems ?? []
  if (!items.length) throw new Error('No media items selected')

  const baseUrl = items[0].mediaFile?.baseUrl
  if (!baseUrl) throw new Error('Media item has no download URL')

  const downloadRes = await fetch(`${baseUrl}=d`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!downloadRes.ok) throw new Error(`Failed to download photo: ${downloadRes.status}`)

  const buffer = Buffer.from(await downloadRes.arrayBuffer())
  const uploaded = await resizeAndUploadImage(wardrobeId, buffer)

  // The picker cannot preview via /api/drive/image yet: that route resolves the
  // owning wardrobe from a clothing_items row, and no row exists until the form
  // is submitted. Send a small thumbnail inline instead — the alternative,
  // Google's own baseUrl, needs the access token to fetch.
  const thumbnail = await sharp(buffer)
    .rotate()
    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer()

  return { ...uploaded, previewDataUrl: `data:image/jpeg;base64,${thumbnail.toString('base64')}` }
}
