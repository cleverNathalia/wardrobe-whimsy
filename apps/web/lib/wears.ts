import { prisma } from './prisma'
import { getWardrobe, imageUrlFor, startOfUtcDay } from './wardrobe-db'

/**
 * Two things record that an outfit was worn: a wear log ("Wore it", no photo)
 * and a look linked to an outfit (a photo of it being worn). Both count, but
 * an outfit worn once on a day counts once, however many of each were added.
 */
interface WearDay {
  outfitId: string
  /** `YYYY-MM-DD` — both sources store a calendar date at midnight UTC. */
  day: string
}

const NOT_WORN_LATELY_DAYS = 60
const TOP_N = 5

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysAgo(days: number): string {
  const today = startOfUtcDay()
  return dayKey(new Date(today.getTime() - days * 24 * 60 * 60 * 1000))
}

/** One entry per outfit per calendar day, newest first. */
function toWearDays(rows: Array<{ outfitId: string | null; wornAt: Date }>): WearDay[] {
  const unique = new Map<string, WearDay>()

  for (const row of rows) {
    if (!row.outfitId) continue
    const day = dayKey(row.wornAt)
    unique.set(`${row.outfitId}|${day}`, { outfitId: row.outfitId, day })
  }

  return [...unique.values()].sort((a, b) => b.day.localeCompare(a.day))
}

/** Running count and most recent day, built up one wear at a time. */
interface Tally {
  count: number
  lastWorn: string | null
}

function bump(tallies: Map<string, Tally>, id: string, day: string) {
  const tally = tallies.get(id) ?? { count: 0, lastWorn: null }
  tally.count += 1
  if (!tally.lastWorn || day > tally.lastWorn) tally.lastWorn = day
  tallies.set(id, tally)
}

export interface DashboardStats {
  totals: {
    items: number
    outfits: number
    wearsThisMonth: number
    wearsLastMonth: number
  }
  recentlyWorn: Array<{ outfitId: string; outfitName: string; day: string }>
  mostWornOutfits: Array<{ outfitId: string; name: string; count: number; lastWorn: string }>
  mostWornItems: Array<{ itemId: string; name: string; imageUrl: string; count: number; lastWorn: string }>
  notWornLately: {
    /** How many active items qualify, of which `items` is the oldest few. */
    total: number
    items: Array<{ itemId: string; name: string; imageUrl: string; lastWorn: string | null }>
  }
}

/**
 * Everything the dashboard shows, computed fresh on each request so the
 * figures always match the data (FR-6.2).
 *
 * Items are credited through the outfits they are in *today*: wear logs record
 * the outfit, not its contents, so an item swapped out of an outfit takes that
 * outfit's earlier wears with it.
 */
export async function getDashboardStats(wardrobeId: string, userId: string): Promise<DashboardStats> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const [items, outfits, wearLogs, looks] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { wardrobeId, status: 'ACTIVE' },
      select: { id: true, name: true, imageFileId: true, createdAt: true },
    }),
    prisma.outfit.findMany({
      where: { wardrobeId },
      select: { id: true, name: true, items: { select: { clothingItemId: true } } },
    }),
    prisma.wearLog.findMany({ where: { wardrobeId }, select: { outfitId: true, wornAt: true } }),
    prisma.look.findMany({
      where: { wardrobeId, outfitId: { not: null } },
      select: { outfitId: true, wornAt: true },
    }),
  ])

  const wears = toWearDays([...wearLogs, ...looks])
  const outfitsById = new Map(outfits.map((outfit) => [outfit.id, outfit]))

  const outfitTallies = new Map<string, Tally>()
  const itemTallies = new Map<string, Tally>()
  for (const wear of wears) {
    bump(outfitTallies, wear.outfitId, wear.day)
    for (const { clothingItemId } of outfitsById.get(wear.outfitId)?.items ?? []) {
      bump(itemTallies, clothingItemId, wear.day)
    }
  }

  const thisMonth = dayKey(startOfUtcDay()).slice(0, 7)
  const now = new Date()
  const lastMonth = dayKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))).slice(0, 7)

  // Most worn first; ties go to whichever was worn more recently.
  const byCountThenRecency = (a: Tally, b: Tally) =>
    b.count - a.count || (b.lastWorn ?? '').localeCompare(a.lastWorn ?? '')

  const mostWornOutfits = [...outfitTallies.entries()]
    .sort(([, a], [, b]) => byCountThenRecency(a, b))
    .slice(0, TOP_N)
    .flatMap(([outfitId, tally]) => {
      const outfit = outfitsById.get(outfitId)
      return outfit ? [{ outfitId, name: outfit.name, count: tally.count, lastWorn: tally.lastWorn! }] : []
    })

  const itemsById = new Map(items.map((item) => [item.id, item]))
  const mostWornItems = [...itemTallies.entries()]
    .filter(([itemId]) => itemsById.has(itemId))
    .sort(([, a], [, b]) => byCountThenRecency(a, b))
    .slice(0, TOP_N)
    .map(([itemId, tally]) => {
      const item = itemsById.get(itemId)!
      return {
        itemId,
        name: item.name,
        imageUrl: imageUrlFor(item.imageFileId),
        count: tally.count,
        lastWorn: tally.lastWorn!,
      }
    })

  // An item counts from the day it was added, so one added last week is not
  // flagged as forgotten just because it has not been worn yet.
  const cutoff = daysAgo(NOT_WORN_LATELY_DAYS)
  const stale = items
    .map((item) => {
      const lastWorn = itemTallies.get(item.id)?.lastWorn ?? null
      return { item, lastWorn, since: lastWorn ?? dayKey(item.createdAt) }
    })
    .filter(({ since }) => since < cutoff)
    .sort((a, b) => a.since.localeCompare(b.since))

  return {
    totals: {
      items: items.length,
      outfits: outfits.length,
      wearsThisMonth: wears.filter((wear) => wear.day.startsWith(thisMonth)).length,
      wearsLastMonth: wears.filter((wear) => wear.day.startsWith(lastMonth)).length,
    },
    recentlyWorn: wears.slice(0, TOP_N).flatMap((wear) => {
      const outfit = outfitsById.get(wear.outfitId)
      return outfit ? [{ outfitId: wear.outfitId, outfitName: outfit.name, day: wear.day }] : []
    }),
    mostWornOutfits,
    mostWornItems,
    notWornLately: {
      total: stale.length,
      items: stale.slice(0, TOP_N).map(({ item, lastWorn }) => ({
        itemId: item.id,
        name: item.name,
        imageUrl: imageUrlFor(item.imageFileId),
        lastWorn,
      })),
    },
  }
}

export type OutfitWearEntry =
  | { kind: 'log'; id: string; day: string; notes: string | null }
  | { kind: 'look'; id: string; day: string; notes: string | null; imageUrl: string }

export interface OutfitWearHistory {
  /** Distinct days worn — what the dashboard counts. */
  timesWorn: number
  /** Every log and linked look, newest first (FR-6.3). */
  entries: OutfitWearEntry[]
}

export async function getOutfitWearHistory(
  wardrobeId: string,
  userId: string,
  outfitId: string
): Promise<OutfitWearHistory> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const [logs, looks] = await Promise.all([
    prisma.wearLog.findMany({ where: { wardrobeId, outfitId } }),
    prisma.look.findMany({ where: { wardrobeId, outfitId } }),
  ])

  const entries: OutfitWearEntry[] = [
    ...logs.map((log) => ({ kind: 'log' as const, id: log.id, day: dayKey(log.wornAt), notes: log.notes })),
    ...looks.map((look) => ({
      kind: 'look' as const,
      id: look.id,
      day: dayKey(look.wornAt),
      notes: look.notes,
      imageUrl: imageUrlFor(look.imageFileId),
    })),
  ].sort((a, b) => b.day.localeCompare(a.day))

  return { timesWorn: toWearDays([...logs, ...looks]).length, entries }
}
