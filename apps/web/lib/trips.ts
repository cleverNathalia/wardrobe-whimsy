import { Prisma } from '@prisma/client'
import {
  PackingLimitsSchema,
  type PackingLimits,
  type TripCreate,
  type TripItemUpdate,
  type TripUpdate,
} from '@wardrobe-whimsy/api-client'
import { prisma } from './prisma'
import {
  ItemsNotFoundError,
  OutfitNotFoundError,
  TripNotFoundError,
  assertOutfitInWardrobe,
  getWardrobe,
  imageUrlFor,
  startOfUtcDay,
  toOutfitWithItems,
} from './wardrobe-db'
import { getOutfitsWornBetween } from './wears'
import { buildPackingList, buildTripRecap, tripDays, tripStatus } from './trips/packing-list'
import type { Trip, TripDetail } from './wardrobe-types'

export { TripNotFoundError }

/**
 * Outfits come back oldest first: the packing list's over-limit check takes
 * items in trip order, and oldest-first keeps that order stable as outfits are
 * added.
 */
const tripInclude = {
  outfits: {
    include: {
      outfit: { include: { items: { include: { clothingItem: true }, orderBy: { zIndex: 'asc' } } } },
    },
    orderBy: { outfit: { createdAt: 'asc' } },
  },
  items: { include: { clothingItem: true } },
} satisfies Prisma.TripInclude

type TripRow = Prisma.TripGetPayload<{ include: typeof tripInclude }>

/** Limits are a JSON column; anything that doesn't parse is treated as no limits. */
function readLimits(value: Prisma.JsonValue): PackingLimits {
  return PackingLimitsSchema.safeParse(value).data ?? {}
}

function todayKey(): string {
  return startOfUtcDay().toISOString().slice(0, 10)
}

function sourceItem(item: { id: string; name: string; category: string; imageFileId: string }) {
  return { id: item.id, name: item.name, category: item.category, imageUrl: imageUrlFor(item.imageFileId) }
}

function toTrip(row: TripRow): Trip {
  const limits = readLimits(row.limits)
  const packingList = buildPackingList(
    row.outfits.map(({ outfit }) => ({
      id: outfit.id,
      name: outfit.name,
      items: outfit.items.map(({ clothingItem }) => sourceItem(clothingItem)),
    })),
    row.items.map((tripItem) => ({
      item: sourceItem(tripItem.clothingItem),
      isLoose: tripItem.isLoose,
      packed: tripItem.packedAt !== null,
    })),
    limits
  )

  return {
    id: row.id,
    wardrobeId: row.wardrobeId,
    name: row.name,
    notes: row.notes,
    startDate: row.startDate,
    endDate: row.endDate,
    limits,
    status: tripStatus(row.startDate, row.endDate, todayKey()),
    days: tripDays(row.startDate, row.endDate),
    outfitIds: row.outfits.map((link) => link.outfitId),
    packingList,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Rejects outfit ids from another wardrobe, rather than linking across users. */
async function assertOutfitsInWardrobe(wardrobeId: string, outfitIds: string[]) {
  const unique = [...new Set(outfitIds)]
  const found = await prisma.outfit.count({ where: { wardrobeId, id: { in: unique } } })
  if (found !== unique.length) throw new OutfitNotFoundError()
  return unique
}

async function assertTripInWardrobe(wardrobeId: string, tripId: string) {
  const found = await prisma.trip.count({ where: { id: tripId, wardrobeId } })
  if (!found) throw new TripNotFoundError()
}

/** A JSON column is cleared with DbNull, not null. */
function limitsValue(limits: PackingLimits | null) {
  return limits === null || Object.keys(limits).length === 0 ? Prisma.DbNull : limits
}

export async function listTrips(wardrobeId: string, userId: string): Promise<Trip[]> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const rows = await prisma.trip.findMany({
    where: { wardrobeId },
    include: tripInclude,
    orderBy: [{ startDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
  })
  return rows.map(toTrip)
}

export async function getTrip(wardrobeId: string, userId: string, tripId: string): Promise<TripDetail | null> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const row = await prisma.trip.findFirst({ where: { id: tripId, wardrobeId }, include: tripInclude })
  if (!row) return null

  const trip = toTrip(row)
  const worn =
    trip.status !== 'upcoming' && row.startDate && row.endDate
      ? await getOutfitsWornBetween(wardrobeId, trip.outfitIds, row.startDate, row.endDate)
      : new Set<string>()

  return {
    ...trip,
    outfits: row.outfits.map(({ outfit }) => toOutfitWithItems(outfit)),
    wornOutfitIds: [...worn],
    recap: trip.status === 'past' ? buildTripRecap(trip.packingList, trip.outfitIds, worn) : null,
  }
}

export async function createTrip(wardrobeId: string, userId: string, data: TripCreate): Promise<Trip> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  const outfitIds = await assertOutfitsInWardrobe(wardrobeId, data.outfitIds ?? [])

  const row = await prisma.trip.create({
    data: {
      wardrobeId,
      name: data.name,
      notes: data.notes || null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      limits: limitsValue(data.limits ?? null),
      outfits: { create: outfitIds.map((outfitId) => ({ outfitId })) },
    },
    include: tripInclude,
  })
  return toTrip(row)
}

/** Fields left out are left alone. `outfitIds`, when sent, replaces the whole list. */
export async function updateTrip(
  wardrobeId: string,
  userId: string,
  tripId: string,
  data: TripUpdate
): Promise<Trip | null> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const existing = await prisma.trip.findFirst({ where: { id: tripId, wardrobeId } })
  if (!existing) return null

  const outfitIds = data.outfitIds ? await assertOutfitsInWardrobe(wardrobeId, data.outfitIds) : null

  const row = await prisma.$transaction(async (tx) => {
    if (outfitIds) {
      await tx.tripOutfit.deleteMany({ where: { tripId } })
      await tx.tripOutfit.createMany({ data: outfitIds.map((outfitId) => ({ tripId, outfitId })) })
    }

    return tx.trip.update({
      where: { id: tripId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        // The schema only lets the dates through together.
        ...(data.startDate !== undefined && { startDate: data.startDate ?? null, endDate: data.endDate ?? null }),
        ...(data.limits !== undefined && { limits: limitsValue(data.limits) }),
      },
      include: tripInclude,
    })
  })

  return toTrip(row)
}

export async function deleteTrip(wardrobeId: string, userId: string, tripId: string): Promise<boolean> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  // Its outfit links and item rows go with it (onDelete: Cascade); the outfits stay.
  const { count } = await prisma.trip.deleteMany({ where: { id: tripId, wardrobeId } })
  return count > 0
}

/** Replaces which outfits are in a trip. */
export async function setTripOutfits(
  wardrobeId: string,
  userId: string,
  tripId: string,
  outfitIds: string[]
): Promise<void> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  await assertTripInWardrobe(wardrobeId, tripId)
  const unique = await assertOutfitsInWardrobe(wardrobeId, outfitIds)

  await prisma.$transaction([
    prisma.tripOutfit.deleteMany({ where: { tripId } }),
    prisma.tripOutfit.createMany({ data: unique.map((outfitId) => ({ tripId, outfitId })) }),
  ])
}

/**
 * Adds an item to a trip on its own, takes it off again, or ticks it packed or
 * unpacked. A row that ends up neither loose nor packed is deleted — items that
 * only come from outfits need no row. Ticking an item that is already packed
 * keeps its original packed time.
 */
export async function setTripItem(
  wardrobeId: string,
  userId: string,
  tripId: string,
  clothingItemId: string,
  change: TripItemUpdate
): Promise<void> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  await assertTripInWardrobe(wardrobeId, tripId)
  if (!(await prisma.clothingItem.count({ where: { id: clothingItemId, wardrobeId } }))) {
    throw new ItemsNotFoundError()
  }

  const key = { tripId_clothingItemId: { tripId, clothingItemId } }
  const existing = await prisma.tripItem.findUnique({ where: key })

  const isLoose = change.isLoose ?? existing?.isLoose ?? false
  const packedAt =
    change.packed === undefined ? (existing?.packedAt ?? null) : change.packed ? (existing?.packedAt ?? new Date()) : null

  if (!isLoose && !packedAt) {
    await prisma.tripItem.deleteMany({ where: { tripId, clothingItemId } })
    return
  }

  await prisma.tripItem.upsert({
    where: key,
    create: { tripId, clothingItemId, isLoose, packedAt },
    update: { isLoose, packedAt },
  })
}

/** The same many-to-many link, edited from the outfit's side: replaces which trips it is in. */
export async function setOutfitTrips(
  wardrobeId: string,
  userId: string,
  outfitId: string,
  tripIds: string[]
): Promise<void> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  await assertOutfitInWardrobe(wardrobeId, outfitId)

  const unique = [...new Set(tripIds)]
  const found = await prisma.trip.count({ where: { wardrobeId, id: { in: unique } } })
  if (found !== unique.length) throw new TripNotFoundError()

  await prisma.$transaction([
    prisma.tripOutfit.deleteMany({ where: { outfitId } }),
    prisma.tripOutfit.createMany({ data: unique.map((tripId) => ({ tripId, outfitId })) }),
  ])
}

/** Just the name, for pages that link back to a trip. Null if it isn't one of this wardrobe's. */
export async function getTripSummary(
  wardrobeId: string,
  userId: string,
  tripId: string
): Promise<{ id: string; name: string } | null> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  return prisma.trip.findFirst({ where: { id: tripId, wardrobeId }, select: { id: true, name: true } })
}
