import { randomUUID } from 'node:crypto'
import type { drive_v3 } from 'googleapis'
import type { ClothingItemCreate, ClothingItemUpdate, OutfitCreate, OutfitUpdate } from '@wardrobe-whimsy/api-client'
import {
  getDriveClient,
  readIndex,
  writeIndex,
  deleteFile,
  type WardrobeIndex,
  type StoredClothingItem,
  type StoredOutfit,
} from './google-drive'
import type { ClothingItem, OutfitWithItems } from './wardrobe-types'

export class ItemsNotFoundError extends Error {
  constructor() {
    super('One or more items not found')
    this.name = 'ItemsNotFoundError'
  }
}

// Unconditional read-modify-write (Drive v3 has no reliable body-level etag for
// conditional writes) — last-write-wins is an accepted v1 limitation for this
// single-user-per-account data.
async function mutateIndex<T>(
  clerkUserId: string,
  mutator: (index: WardrobeIndex, drive: drive_v3.Drive) => Promise<T> | T,
): Promise<T> {
  const drive = await getDriveClient(clerkUserId)
  const { fileId, index } = await readIndex(drive)
  const result = await mutator(index, drive)
  await writeIndex(drive, fileId, index)
  return result
}

function imageUrlFor(fileId: string): string {
  return `/api/drive/image/${fileId}`
}

function hydrateItem(item: StoredClothingItem, clerkUserId: string): ClothingItem {
  return { ...item, userId: clerkUserId, imageUrl: imageUrlFor(item.imageFileId) }
}

function hydrateOutfit(outfit: StoredOutfit, index: WardrobeIndex, clerkUserId: string): OutfitWithItems {
  const itemsById = new Map(index.clothingItems.map((ci) => [ci.id, ci]))
  return {
    id: outfit.id,
    userId: clerkUserId,
    name: outfit.name,
    occasion: outfit.occasion,
    season: outfit.season,
    notes: outfit.notes,
    tags: outfit.tags,
    coverImageFileId: outfit.coverImageFileId,
    coverImageUrl: outfit.coverImageFileId ? imageUrlFor(outfit.coverImageFileId) : null,
    createdAt: outfit.createdAt,
    updatedAt: outfit.updatedAt,
    items: outfit.items
      .slice()
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((oi) => {
        const ci = itemsById.get(oi.clothingItemId)
        return {
          id: oi.id,
          outfitId: outfit.id,
          clothingItemId: oi.clothingItemId,
          positionX: oi.positionX,
          positionY: oi.positionY,
          scale: oi.scale,
          rotation: oi.rotation,
          zIndex: oi.zIndex,
          clothingItem: ci
            ? { id: ci.id, name: ci.name, category: ci.category, imageUrl: imageUrlFor(ci.imageFileId) }
            : { id: oi.clothingItemId, name: '(deleted item)', category: '', imageUrl: '' },
        }
      }),
  }
}

// ---- Clothing items ----

export async function listClothingItems(clerkUserId: string): Promise<ClothingItem[]> {
  const drive = await getDriveClient(clerkUserId)
  const { index } = await readIndex(drive)
  return index.clothingItems
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((i) => hydrateItem(i, clerkUserId))
}

export async function getClothingItem(clerkUserId: string, id: string): Promise<ClothingItem | null> {
  const drive = await getDriveClient(clerkUserId)
  const { index } = await readIndex(drive)
  const item = index.clothingItems.find((i) => i.id === id)
  return item ? hydrateItem(item, clerkUserId) : null
}

export async function createClothingItem(
  clerkUserId: string,
  data: ClothingItemCreate,
): Promise<ClothingItem> {
  const now = new Date().toISOString()
  const record: StoredClothingItem = {
    id: `ci_${randomUUID()}`,
    name: data.name,
    category: data.category,
    subcategory: data.subcategory ?? null,
    colour: data.colour ?? null,
    season: data.season ?? null,
    occasion: data.occasion ?? null,
    brand: data.brand ?? null,
    size: data.size ?? null,
    imageFileId: data.imageFileId,
    imageSource: data.imageSource,
    status: 'ACTIVE',
    notes: data.notes ?? null,
    isFavourite: data.isFavourite ?? false,
    createdAt: now,
    updatedAt: now,
  }

  await mutateIndex(clerkUserId, (index) => {
    index.clothingItems.push(record)
  })

  return hydrateItem(record, clerkUserId)
}

export async function updateClothingItem(
  clerkUserId: string,
  id: string,
  data: ClothingItemUpdate,
): Promise<ClothingItem | null> {
  let updated: StoredClothingItem | null = null

  await mutateIndex(clerkUserId, async (index, drive) => {
    const idx = index.clothingItems.findIndex((i) => i.id === id)
    if (idx === -1) return

    const existing = index.clothingItems[idx]
    const next: StoredClothingItem = {
      ...existing,
      ...data,
      status: data.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    }

    if (data.imageFileId && data.imageFileId !== existing.imageFileId) {
      await deleteFile(drive, existing.imageFileId)
    }

    index.clothingItems[idx] = next
    updated = next
  })

  return updated ? hydrateItem(updated, clerkUserId) : null
}

export async function deleteClothingItem(clerkUserId: string, id: string): Promise<boolean> {
  let deleted = false
  let fileToDelete: string | null = null

  await mutateIndex(clerkUserId, (index) => {
    const idx = index.clothingItems.findIndex((i) => i.id === id)
    if (idx === -1) return

    fileToDelete = index.clothingItems[idx].imageFileId
    index.clothingItems.splice(idx, 1)
    deleted = true

    for (const outfit of index.outfits) {
      outfit.items = outfit.items.filter((oi) => oi.clothingItemId !== id)
      if (outfit.coverImageFileId === fileToDelete) {
        const nextItem = outfit.items[0]
          ? index.clothingItems.find((ci) => ci.id === outfit.items[0].clothingItemId)
          : undefined
        outfit.coverImageFileId = nextItem?.imageFileId ?? null
      }
    }
  })

  if (deleted && fileToDelete) {
    const drive = await getDriveClient(clerkUserId)
    await deleteFile(drive, fileToDelete)
  }

  return deleted
}

// ---- Outfits ----

export async function listOutfits(clerkUserId: string): Promise<OutfitWithItems[]> {
  const drive = await getDriveClient(clerkUserId)
  const { index } = await readIndex(drive)
  return index.outfits
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => hydrateOutfit(o, index, clerkUserId))
}

export async function getOutfit(clerkUserId: string, id: string): Promise<OutfitWithItems | null> {
  const drive = await getDriveClient(clerkUserId)
  const { index } = await readIndex(drive)
  const outfit = index.outfits.find((o) => o.id === id)
  return outfit ? hydrateOutfit(outfit, index, clerkUserId) : null
}

export async function createOutfit(clerkUserId: string, data: OutfitCreate): Promise<OutfitWithItems> {
  let created: StoredOutfit | null = null
  let indexSnapshot: WardrobeIndex | null = null

  await mutateIndex(clerkUserId, (index) => {
    const validIds = new Set(index.clothingItems.map((i) => i.id))
    if (!data.itemIds.every((id) => validIds.has(id))) throw new ItemsNotFoundError()

    const now = new Date().toISOString()
    const firstItem = index.clothingItems.find((i) => i.id === data.itemIds[0])
    const outfit: StoredOutfit = {
      id: `of_${randomUUID()}`,
      name: data.name,
      occasion: data.occasion ?? null,
      season: data.season ?? null,
      notes: data.notes ?? null,
      tags: data.tags ?? [],
      coverImageFileId: firstItem?.imageFileId ?? null,
      createdAt: now,
      updatedAt: now,
      items: data.itemIds.map((id, i) => ({
        id: `oi_${randomUUID()}`,
        clothingItemId: id,
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        zIndex: i,
      })),
    }
    index.outfits.push(outfit)
    created = outfit
    indexSnapshot = index
  })

  return hydrateOutfit(created!, indexSnapshot!, clerkUserId)
}

export async function updateOutfit(
  clerkUserId: string,
  id: string,
  data: OutfitUpdate,
): Promise<OutfitWithItems | null> {
  let updated: StoredOutfit | null = null
  let indexSnapshot: WardrobeIndex | null = null

  await mutateIndex(clerkUserId, (index) => {
    const idx = index.outfits.findIndex((o) => o.id === id)
    if (idx === -1) return

    const existing = index.outfits[idx]
    const { itemIds, tags, ...rest } = data
    let items = existing.items
    let coverImageFileId = existing.coverImageFileId

    if (itemIds && itemIds.length > 0) {
      const validIds = new Set(index.clothingItems.map((i) => i.id))
      if (!itemIds.every((itemId) => validIds.has(itemId))) throw new ItemsNotFoundError()

      const firstItem = index.clothingItems.find((i) => i.id === itemIds[0])
      coverImageFileId = firstItem?.imageFileId ?? null
      items = itemIds.map((clothingItemId, i) => ({
        id: `oi_${randomUUID()}`,
        clothingItemId,
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        zIndex: i,
      }))
    }

    const next: StoredOutfit = {
      ...existing,
      ...rest,
      tags: tags ?? existing.tags,
      items,
      coverImageFileId,
      updatedAt: new Date().toISOString(),
    }
    index.outfits[idx] = next
    updated = next
    indexSnapshot = index
  })

  return updated ? hydrateOutfit(updated, indexSnapshot!, clerkUserId) : null
}

export async function deleteOutfit(clerkUserId: string, id: string): Promise<boolean> {
  let deleted = false

  await mutateIndex(clerkUserId, (index) => {
    const idx = index.outfits.findIndex((o) => o.id === id)
    if (idx === -1) return
    index.outfits.splice(idx, 1)
    index.wearLogs = index.wearLogs.filter((w) => w.outfitId !== id)
    deleted = true
  })

  return deleted
}
