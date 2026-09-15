import type { Prisma, ClothingItem as PrismaClothingItem } from '@prisma/client'
import { prisma } from './prisma'
import type {
  ClothingItem,
  ImageSource,
  ItemStatus,
  LookWithOutfit,
  OutfitWithItems,
} from './wardrobe-types'

type PrismaOutfitWithItems = Prisma.OutfitGetPayload<{
  include: { items: { include: { clothingItem: true } } }
}>

type PrismaLookWithOutfit = Prisma.LookGetPayload<{
  include: { outfit: { include: { items: { include: { clothingItem: true } } } } }
}>

/**
 * Drive files are fetched through our own proxy, which resolves the owning
 * wardrobe from the file id itself.
 *
 * Deliberately no query string: next/image matches `images.localPatterns`
 * `search` exactly, with no wildcard, so a varying `?wardrobeId=` would be
 * rejected by the optimiser.
 */
function imageUrlFor(imageFileId: string): string {
  return `/api/drive/image/${imageFileId}`
}

/**
 * Adds the proxied image URL and narrows the columns Prisma types as plain
 * `String` onto their domain unions.
 */
function toClothingItem(row: PrismaClothingItem): ClothingItem {
  return {
    ...row,
    imageSource: row.imageSource as ImageSource,
    status: row.status as ItemStatus,
    imageUrl: imageUrlFor(row.imageFileId),
  }
}

/**
 * Nested clothing items need their proxied image URL too — without this the
 * outfit cards render with no pictures.
 */
function toOutfitWithItems(row: PrismaOutfitWithItems): OutfitWithItems {
  return {
    ...row,
    coverImageUrl: row.coverImageFileId ? imageUrlFor(row.coverImageFileId) : null,
    items: row.items.map((outfitItem) => ({
      ...outfitItem,
      clothingItem: toClothingItem(outfitItem.clothingItem),
    })),
  }
}

export class ItemsNotFoundError extends Error {
  constructor() {
    super('One or more items not found')
    this.name = 'ItemsNotFoundError'
  }
}

export class WardrobeNotFoundError extends Error {
  constructor() {
    super('Wardrobe not found')
    this.name = 'WardrobeNotFoundError'
  }
}

export class OutfitNotFoundError extends Error {
  constructor() {
    super('Outfit not found')
    this.name = 'OutfitNotFoundError'
  }
}

// ---- Wardrobe Management ----

export async function getOrCreateDefaultWardrobe(userId: string) {
  let wardrobe = await prisma.wardrobe.findFirst({
    where: { userId, isDefault: true },
  })

  if (!wardrobe) {
    wardrobe = await prisma.wardrobe.create({
      data: {
        userId,
        name: 'My Wardrobe',
        googleFolderId: null, // Set when the app creates the folder in the user's Drive
        isDefault: true,
      },
    })
  }

  return wardrobe
}

export async function getUserWardrobes(userId: string) {
  return prisma.wardrobe.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getWardrobe(wardrobeId: string, userId: string) {
  const wardrobe = await prisma.wardrobe.findUnique({
    where: { id: wardrobeId },
  })

  if (!wardrobe || wardrobe.userId !== userId) {
    throw new WardrobeNotFoundError()
  }

  return wardrobe
}

export async function createWardrobe(userId: string, name: string, googleFolderId: string) {
  return prisma.wardrobe.create({
    data: {
      userId,
      name,
      googleFolderId,
      isDefault: false,
    },
  })
}

export async function updateWardrobeGoogleFolderId(
  wardrobeId: string,
  userId: string,
  googleFolderId: string
) {
  // Throws if the wardrobe isn't this user's.
  await getWardrobe(wardrobeId, userId)

  return prisma.wardrobe.update({
    where: { id: wardrobeId },
    data: { googleFolderId },
  })
}

// ---- Clothing Items ----

export async function listClothingItems(wardrobeId: string, userId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const items = await prisma.clothingItem.findMany({
    where: { wardrobeId },
    orderBy: { createdAt: 'desc' },
  })

  return items.map((item) => toClothingItem(item))
}

export async function getClothingItem(wardrobeId: string, userId: string, itemId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const item = await prisma.clothingItem.findUnique({
    where: { id: itemId },
  })

  if (!item || item.wardrobeId !== wardrobeId) {
    return null
  }

  return toClothingItem(item)
}

export async function createClothingItem(
  wardrobeId: string,
  userId: string,
  data: {
    name: string
    category: string
    subcategory?: string | null
    colour?: string | null
    season?: string | null
    occasion?: string | null
    brand?: string | null
    size?: string | null
    imageFileId: string
    imageSource: 'manual' | 'google_photos'
    notes?: string | null
    isFavourite?: boolean
  }
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  return prisma.clothingItem.create({
    data: {
      wardrobeId,
      ...data,
      isFavourite: data.isFavourite ?? false,
    },
  })
}

export async function updateClothingItem(
  wardrobeId: string,
  userId: string,
  itemId: string,
  data: Partial<Omit<Parameters<typeof createClothingItem>[2], 'imageFileId'> & { imageFileId?: string }>
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const item = await prisma.clothingItem.findUnique({
    where: { id: itemId },
  })

  if (!item || item.wardrobeId !== wardrobeId) {
    return null
  }

  return prisma.clothingItem.update({
    where: { id: itemId },
    data,
  })
}

export async function deleteClothingItem(
  wardrobeId: string,
  userId: string,
  itemId: string
): Promise<{ fileToDelete: string | null; deleted: boolean }> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const item = await prisma.clothingItem.findUnique({
    where: { id: itemId },
  })

  if (!item || item.wardrobeId !== wardrobeId) {
    return { fileToDelete: null, deleted: false }
  }

  // Delete outfit items that reference this clothing item
  await prisma.outfitItem.deleteMany({
    where: { clothingItemId: itemId },
  })

  // Delete the clothing item
  await prisma.clothingItem.delete({
    where: { id: itemId },
  })

  return { fileToDelete: item.imageFileId, deleted: true }
}

// ---- Outfits ----

export async function listOutfits(wardrobeId: string, userId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const outfits = await prisma.outfit.findMany({
    where: { wardrobeId },
    include: {
      items: {
        include: {
          clothingItem: true,
        },
        orderBy: { zIndex: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return outfits.map((outfit) => toOutfitWithItems(outfit))
}

export async function getOutfit(wardrobeId: string, userId: string, outfitId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const outfit = await prisma.outfit.findUnique({
    where: { id: outfitId },
    include: {
      items: {
        include: {
          clothingItem: true,
        },
        orderBy: { zIndex: 'asc' },
      },
    },
  })

  if (!outfit || outfit.wardrobeId !== wardrobeId) {
    return null
  }

  return toOutfitWithItems(outfit)
}

export async function createOutfit(
  wardrobeId: string,
  userId: string,
  data: {
    name: string
    occasion?: string | null
    season?: string | null
    notes?: string | null
    tags?: string[]
    itemIds: string[]
  }
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  // Verify all items belong to this wardrobe
  const items = await prisma.clothingItem.findMany({
    where: { id: { in: data.itemIds }, wardrobeId },
  })

  if (items.length !== data.itemIds.length) {
    throw new ItemsNotFoundError()
  }

  const firstItem = items[0]
  return prisma.outfit.create({
    data: {
      wardrobeId,
      name: data.name,
      occasion: data.occasion,
      season: data.season,
      notes: data.notes,
      tags: data.tags ?? [],
      coverImageFileId: firstItem?.imageFileId ?? null,
      items: {
        create: data.itemIds.map((clothingItemId, index) => ({
          clothingItemId,
          positionX: 0,
          positionY: 0,
          scale: 1,
          rotation: 0,
          zIndex: index,
        })),
      },
    },
    include: {
      items: {
        include: {
          clothingItem: true,
        },
      },
    },
  })
}

export async function updateOutfit(
  wardrobeId: string,
  userId: string,
  outfitId: string,
  data: Partial<{
    name: string
    occasion: string | null
    season: string | null
    notes: string | null
    tags: string[]
    itemIds: string[]
  }>
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const outfit = await prisma.outfit.findUnique({
    where: { id: outfitId },
  })

  if (!outfit || outfit.wardrobeId !== wardrobeId) {
    return null
  }

  let coverImageFileId = outfit.coverImageFileId

  if (data.itemIds) {
    // Verify all items belong to this wardrobe
    const items = await prisma.clothingItem.findMany({
      where: { id: { in: data.itemIds }, wardrobeId },
    })

    if (items.length !== data.itemIds.length) {
      throw new ItemsNotFoundError()
    }

    // Delete old outfit items
    await prisma.outfitItem.deleteMany({
      where: { outfitId },
    })

    // Create new outfit items
    await prisma.outfitItem.createMany({
      data: data.itemIds.map((clothingItemId, index) => ({
        outfitId,
        clothingItemId,
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        zIndex: index,
      })),
    })

    // Update cover image
    const firstItem = items[0]
    coverImageFileId = firstItem?.imageFileId ?? null
  }

  return prisma.outfit.update({
    where: { id: outfitId },
    data: {
      name: data.name,
      occasion: data.occasion,
      season: data.season,
      notes: data.notes,
      tags: data.tags,
      coverImageFileId,
    },
    include: {
      items: {
        include: {
          clothingItem: true,
        },
      },
    },
  })
}

export async function deleteOutfit(wardrobeId: string, userId: string, outfitId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const outfit = await prisma.outfit.findUnique({
    where: { id: outfitId },
  })

  if (!outfit || outfit.wardrobeId !== wardrobeId) {
    return false
  }

  await prisma.outfit.delete({
    where: { id: outfitId },
  })

  return true
}

// ---- Looks ----

/**
 * The linked outfit is included whole so a look can be shown next to the
 * collage it recreates, which needs the outfit's item images too.
 */
function toLookWithOutfit(row: PrismaLookWithOutfit): LookWithOutfit {
  return {
    ...row,
    imageSource: row.imageSource as ImageSource,
    imageUrl: imageUrlFor(row.imageFileId),
    outfit: row.outfit ? toOutfitWithItems(row.outfit) : null,
  }
}

const lookInclude = {
  outfit: { include: { items: { include: { clothingItem: true }, orderBy: { zIndex: 'asc' } } } },
} satisfies Prisma.LookInclude

/**
 * A look may point at an outfit, so the outfit has to be proven to belong to
 * the same wardrobe — otherwise a crafted id could link one user's look to
 * another user's outfit and leak its contents through the detail page.
 */
async function assertOutfitInWardrobe(wardrobeId: string, outfitId: string) {
  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } })

  if (!outfit || outfit.wardrobeId !== wardrobeId) {
    throw new OutfitNotFoundError()
  }
}

export async function listLooks(wardrobeId: string, userId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const looks = await prisma.look.findMany({
    where: { wardrobeId },
    include: lookInclude,
    // Newest worn first — a look is a diary entry, so the date it records
    // matters more than the date it was typed in.
    orderBy: [{ wornAt: 'desc' }, { createdAt: 'desc' }],
  })

  return looks.map((look) => toLookWithOutfit(look))
}

export async function getLook(wardrobeId: string, userId: string, lookId: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const look = await prisma.look.findUnique({
    where: { id: lookId },
    include: lookInclude,
  })

  if (!look || look.wardrobeId !== wardrobeId) {
    return null
  }

  return toLookWithOutfit(look)
}

export async function createLook(
  wardrobeId: string,
  userId: string,
  data: {
    imageFileId: string
    imageSource: 'manual' | 'google_photos'
    outfitId?: string | null
    notes?: string | null
    wornAt?: Date
  }
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  if (data.outfitId) {
    await assertOutfitInWardrobe(wardrobeId, data.outfitId)
  }

  return prisma.look.create({
    data: {
      wardrobeId,
      imageFileId: data.imageFileId,
      imageSource: data.imageSource,
      outfitId: data.outfitId ?? null,
      notes: data.notes,
      wornAt: data.wornAt ?? new Date(),
    },
    include: lookInclude,
  })
}

export async function updateLook(
  wardrobeId: string,
  userId: string,
  lookId: string,
  data: Partial<{
    imageFileId: string
    imageSource: 'manual' | 'google_photos'
    outfitId: string | null
    notes: string | null
    wornAt: Date
  }>
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const look = await prisma.look.findUnique({
    where: { id: lookId },
  })

  if (!look || look.wardrobeId !== wardrobeId) {
    return null
  }

  if (data.outfitId) {
    await assertOutfitInWardrobe(wardrobeId, data.outfitId)
  }

  return prisma.look.update({
    where: { id: lookId },
    // `outfitId: null` unlinks, `undefined` leaves the link alone — which is
    // why the schema uses `.nullish()` rather than `.optional()`.
    data,
    include: lookInclude,
  })
}

export async function deleteLook(
  wardrobeId: string,
  userId: string,
  lookId: string
): Promise<{ fileToDelete: string | null; deleted: boolean }> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const look = await prisma.look.findUnique({
    where: { id: lookId },
  })

  if (!look || look.wardrobeId !== wardrobeId) {
    return { fileToDelete: null, deleted: false }
  }

  await prisma.look.delete({
    where: { id: lookId },
  })

  return { fileToDelete: look.imageFileId, deleted: true }
}

// ---- Wear Logs ----

export async function listWearLogs(wardrobeId: string, userId: string, outfitId?: string) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  return prisma.wearLog.findMany({
    where: {
      wardrobeId,
      ...(outfitId && { outfitId }),
    },
    orderBy: { wornAt: 'desc' },
  })
}

export async function createWearLog(
  wardrobeId: string,
  userId: string,
  outfitId: string,
  notes?: string | null
) {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  // Verify outfit belongs to wardrobe
  const outfit = await prisma.outfit.findUnique({
    where: { id: outfitId },
  })

  if (!outfit || outfit.wardrobeId !== wardrobeId) {
    throw new Error('Outfit not found in this wardrobe')
  }

  return prisma.wearLog.create({
    data: {
      wardrobeId,
      outfitId,
      wornAt: new Date(),
      notes,
    },
  })
}
