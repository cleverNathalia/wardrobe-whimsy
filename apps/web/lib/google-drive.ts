import { Readable } from 'node:stream'
import { google, type drive_v3 } from 'googleapis'
import { clerkClient } from '@clerk/nextjs/server'
import type { WearLog } from './wardrobe-types'

const INDEX_FILENAME = 'index.json'
const PHOTOS_FOLDER_NAME = 'Wardrobe Whimsy'

export class DriveNotConnectedError extends Error {
  constructor() {
    super('Google Drive is not connected for this user')
    this.name = 'DriveNotConnectedError'
  }
}

export interface StoredClothingItem {
  id: string
  name: string
  category: string
  subcategory: string | null
  colour: string | null
  season: string | null
  occasion: string | null
  brand: string | null
  size: string | null
  imageFileId: string
  imageSource: 'manual' | 'google_photos'
  status: 'DRAFT' | 'ACTIVE'
  notes: string | null
  isFavourite: boolean
  createdAt: string
  updatedAt: string
}

export interface StoredOutfitItem {
  id: string
  clothingItemId: string
  positionX: number
  positionY: number
  scale: number
  rotation: number
  zIndex: number
}

export interface StoredOutfit {
  id: string
  name: string
  occasion: string | null
  season: string | null
  notes: string | null
  tags: string[]
  coverImageFileId: string | null
  createdAt: string
  updatedAt: string
  items: StoredOutfitItem[]
}

export interface WardrobeIndex {
  version: 1
  driveConfig: { photosFolderId: string | null }
  clothingItems: StoredClothingItem[]
  outfits: StoredOutfit[]
  wearLogs: WearLog[]
}

function emptyIndex(): WardrobeIndex {
  return { version: 1, driveConfig: { photosFolderId: null }, clothingItems: [], outfits: [], wearLogs: [] }
}

export async function getDriveAccessToken(clerkUserId: string): Promise<string> {
  const client = await clerkClient()
  const { data } = await client.users.getUserOauthAccessToken(clerkUserId, 'google')
  const token = data[0]?.token
  if (!token) throw new DriveNotConnectedError()
  return token
}

export async function hasDriveConnection(clerkUserId: string): Promise<boolean> {
  try {
    await getDriveAccessToken(clerkUserId)
    return true
  } catch {
    return false
  }
}

export function driveClientFromToken(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

export async function getDriveClient(clerkUserId: string): Promise<drive_v3.Drive> {
  const token = await getDriveAccessToken(clerkUserId)
  return driveClientFromToken(token)
}

interface IndexHandle {
  fileId: string
  index: WardrobeIndex
}

async function findIndexFile(drive: drive_v3.Drive) {
  const res = await drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${INDEX_FILENAME}' and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  })
  return res.data.files?.[0] ?? null
}

// Note: Drive API v3's File resource has no body-level etag to condition writes on
// (HTTP ETag is a response header, not reliably exposed through this client for media
// updates). Reads/writes below are therefore unconditional last-write-wins — an
// accepted v1 limitation given this data is single-user-per-account.
export async function readIndex(drive: drive_v3.Drive): Promise<IndexHandle> {
  const existing = await findIndexFile(drive)

  if (!existing?.id) {
    const index = emptyIndex()
    const created = await drive.files.create({
      requestBody: { name: INDEX_FILENAME, parents: ['appDataFolder'] },
      media: { mimeType: 'application/json', body: JSON.stringify(index) },
      fields: 'id',
    })
    return { fileId: created.data.id!, index }
  }

  const content = await drive.files.get({ fileId: existing.id, alt: 'media' }, { responseType: 'json' })

  return {
    fileId: existing.id,
    index: (content.data as unknown as WardrobeIndex) ?? emptyIndex(),
  }
}

export async function writeIndex(drive: drive_v3.Drive, fileId: string, index: WardrobeIndex): Promise<void> {
  await drive.files.update({
    fileId,
    media: { mimeType: 'application/json', body: JSON.stringify(index) },
    fields: 'id',
  })
}

export async function ensurePhotosFolder(drive: drive_v3.Drive, index: WardrobeIndex): Promise<string> {
  if (index.driveConfig.photosFolderId) return index.driveConfig.photosFolderId

  const created = await drive.files.create({
    requestBody: { name: PHOTOS_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  })
  const folderId = created.data.id!
  index.driveConfig.photosFolderId = folderId
  return folderId
}

export async function uploadImage(
  drive: drive_v3.Drive,
  folderId: string,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'image/jpeg', body: Readable.from(buffer) },
    fields: 'id',
  })
  return created.data.id!
}

export async function deleteFile(drive: drive_v3.Drive, fileId: string): Promise<void> {
  await drive.files.delete({ fileId }).catch(() => {})
}

export async function getImageBuffer(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const [meta, res] = await Promise.all([
    drive.files.get({ fileId, fields: 'mimeType' }),
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' }),
  ])
  return { buffer: Buffer.from(res.data as ArrayBuffer), mimeType: meta.data.mimeType ?? 'image/jpeg' }
}
