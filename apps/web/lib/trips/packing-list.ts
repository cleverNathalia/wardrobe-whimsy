import {
  PACKING_GROUP_LABELS,
  PACKING_GROUPS,
  categoryGroup,
  type PackingGroup,
  type PackingLimits,
} from '@wardrobe-whimsy/api-client'

/**
 * Turns a trip's outfits and per-item state into its packing list. Pure — no
 * database, no clock — so the rules live in one tested place, and the API
 * hands the phone app the finished list rather than each client redoing it.
 */

export interface PackingSourceItem {
  id: string
  name: string
  category: string
  imageUrl: string
}

export interface PackingSourceOutfit {
  id: string
  name: string
  items: PackingSourceItem[]
}

/** A `trip_items` row: the item was added on its own, and/or ticked as packed. */
export interface PackingSourceTripItem {
  item: PackingSourceItem
  isLoose: boolean
  packed: boolean
}

export interface PackingListItem extends PackingSourceItem {
  group: PackingGroup
  /** The trip's outfits that use this item, in trip order. */
  outfitIds: string[]
  packed: boolean
  /** Added to the trip on its own. It may be in outfits too. */
  loose: boolean
  /** In exactly one outfit — the first thing to cut when packing light. */
  weakLink: boolean
  /** Ticked as packed, but no outfit uses it any more and it wasn't added on its own. */
  orphanedPacked: boolean
}

export interface PackingListGroup {
  group: PackingGroup
  label: string
  /** Most-used first, then by name. */
  items: PackingListItem[]
  limit: number | null
  /**
   * The items past the limit, in the order the trip took them on: outfits in
   * trip order, then items added on their own. Empty when within the limit.
   */
  overflowItemIds: string[]
}

export interface PackingList {
  /** Only groups with something in them, in packing-list order. */
  groups: PackingListGroup[]
  itemCount: number
  packedCount: number
  outfitCount: number
  /** For the headline: "5 tops + 3 bottoms + 1 dress → 9 outfits planned". */
  baseCounts: { top: number; bottom: number; onePiece: number }
}

export function buildPackingList(
  outfits: PackingSourceOutfit[],
  tripItems: PackingSourceTripItem[],
  limits: PackingLimits = {}
): PackingList {
  // Insertion order is arrival order, which is what decides the overflow.
  const entries = new Map<string, PackingListItem>()

  const entryFor = (item: PackingSourceItem): PackingListItem => {
    let entry = entries.get(item.id)
    if (!entry) {
      entry = {
        ...item,
        group: categoryGroup(item.category),
        outfitIds: [],
        packed: false,
        loose: false,
        weakLink: false,
        orphanedPacked: false,
      }
      entries.set(item.id, entry)
    }
    return entry
  }

  for (const outfit of outfits) {
    for (const item of outfit.items) {
      const entry = entryFor(item)
      // An outfit could list an item twice; it still counts once for that outfit.
      if (!entry.outfitIds.includes(outfit.id)) entry.outfitIds.push(outfit.id)
    }
  }

  for (const tripItem of tripItems) {
    const entry = entryFor(tripItem.item)
    entry.loose = tripItem.isLoose
    entry.packed = tripItem.packed
  }

  for (const entry of entries.values()) {
    entry.weakLink = entry.outfitIds.length === 1
    entry.orphanedPacked = entry.packed && !entry.loose && entry.outfitIds.length === 0
  }

  const all = [...entries.values()]

  const groups = PACKING_GROUPS.flatMap((group): PackingListGroup[] => {
    const inGroup = all.filter((entry) => entry.group === group)
    if (inGroup.length === 0) return []

    const limit = limits[group] ?? null
    const overflowItemIds = limit !== null && inGroup.length > limit ? inGroup.slice(limit).map((e) => e.id) : []

    const items = [...inGroup].sort(
      (a, b) => b.outfitIds.length - a.outfitIds.length || a.name.localeCompare(b.name)
    )
    return [{ group, label: PACKING_GROUP_LABELS[group], items, limit, overflowItemIds }]
  })

  const countIn = (group: PackingGroup) => all.filter((entry) => entry.group === group).length

  return {
    groups,
    itemCount: all.length,
    packedCount: all.filter((entry) => entry.packed).length,
    outfitCount: outfits.length,
    baseCounts: { top: countIn('top'), bottom: countIn('bottom'), onePiece: countIn('onePiece') },
  }
}

export type TripStatus = 'upcoming' | 'now' | 'past'

/**
 * Worked out from the dates rather than stored. A trip with no dates is
 * always upcoming. `today` is a `YYYY-MM-DD` day key, the same form wear days use.
 */
export function tripStatus(startDate: Date | null, endDate: Date | null, today: string): TripStatus {
  if (!startDate || !endDate) return 'upcoming'
  const start = dayKey(startDate)
  const end = dayKey(endDate)
  if (today < start) return 'upcoming'
  if (today > end) return 'past'
  return 'now'
}

/** Days the trip spans, counting both ends: 1 June – 8 June is 8 days. */
export function tripDays(startDate: Date | null, endDate: Date | null): number | null {
  if (!startDate || !endDate) return null
  const ms = Date.parse(dayKey(endDate)) - Date.parse(dayKey(startDate))
  return Math.round(ms / 86_400_000) + 1
}

export interface TripRecap {
  wornOutfitCount: number
  outfitCount: number
  /**
   * Items from the trip's outfits that went unworn: none of their outfits was
   * worn during the trip. Items added on their own have no wear data, so they
   * are left out rather than reported as unworn.
   */
  unwornItems: PackingListItem[]
}

export function buildTripRecap(
  list: PackingList,
  outfitIds: string[],
  wornOutfitIds: ReadonlySet<string>
): TripRecap {
  const items = list.groups.flatMap((group) => group.items)
  return {
    wornOutfitCount: outfitIds.filter((id) => wornOutfitIds.has(id)).length,
    outfitCount: outfitIds.length,
    unwornItems: items.filter(
      (item) => item.outfitIds.length > 0 && item.outfitIds.every((id) => !wornOutfitIds.has(id))
    ),
  }
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
