import { TripNotFoundError, listClothingItems } from '../wardrobe-db'
import { getItemLastWornDays } from '../wears'
import { getTrip } from '../trips'
import type { ClothingItem } from '../wardrobe-types'
import { newCombinations } from './new-combinations'
import { outfitSuggester, type SuggestionRequest } from '.'

/** How many to show for a trip. */
const TRIP_SUGGESTIONS = 3
/** How many to ask for, so enough are left once the trip's existing pairings are dropped. */
const TRIP_CANDIDATES = 20

export interface SuggestionResult {
  reason: string
  /** The suggested items in full, so the UI can show them without a second fetch. */
  items: ClothingItem[]
}

/** Runs the configured suggester over this wardrobe's ACTIVE items. */
export async function getOutfitSuggestions(
  wardrobeId: string,
  userId: string,
  request: SuggestionRequest
): Promise<SuggestionResult[]> {
  // listClothingItems checks ownership before anything else is read.
  const items = (await listClothingItems(wardrobeId, userId)).filter((item) => item.status === 'ACTIVE')
  const lastWorn = await getItemLastWornDays(wardrobeId)

  const suggestions = await outfitSuggester.suggest(
    items.map((item) => ({
      id: item.id,
      category: item.category,
      colour: item.colour,
      season: item.season,
      occasion: item.occasion,
      lastWorn: lastWorn.get(item.id) ?? null,
    })),
    request
  )

  // A suggester naming an item it was not given is ignored, not trusted.
  const itemsById = new Map(items.map((item) => [item.id, item]))
  return suggestions.flatMap((suggestion) => {
    const picked = suggestion.itemIds.flatMap((id) => itemsById.get(id) ?? [])
    return picked.length > 0 ? [{ reason: suggestion.reason, items: picked }] : []
  })
}

/**
 * Outfits that can be made from what a trip is already packing, leaving out
 * pairings its outfits already have — the "mix and match" side of packing
 * light. Every item on the trip's list counts, drafts included: the user put
 * them there. Occasion and season aren't applied; it's one trip.
 */
export async function getTripOutfitSuggestions(
  wardrobeId: string,
  userId: string,
  tripId: string
): Promise<SuggestionResult[]> {
  // getTrip checks ownership before anything else is read.
  const trip = await getTrip(wardrobeId, userId, tripId)
  if (!trip) throw new TripNotFoundError()

  const onList = new Set(trip.packingList.groups.flatMap((group) => group.items.map((item) => item.id)))
  const [items, lastWorn] = await Promise.all([
    listClothingItems(wardrobeId, userId).then((all) => all.filter((item) => onList.has(item.id))),
    getItemLastWornDays(wardrobeId),
  ])

  const suggestions = await outfitSuggester.suggest(
    items.map((item) => ({
      id: item.id,
      category: item.category,
      colour: item.colour,
      season: item.season,
      occasion: item.occasion,
      lastWorn: lastWorn.get(item.id) ?? null,
    })),
    { limit: TRIP_CANDIDATES }
  )

  const itemsById = new Map(items.map((item) => [item.id, item]))
  const results = suggestions.flatMap((suggestion) => {
    const picked = suggestion.itemIds.flatMap((id) => itemsById.get(id) ?? [])
    return picked.length > 0 ? [{ reason: suggestion.reason, items: picked }] : []
  })

  const existing = trip.outfits.map((outfit) => ({ itemIds: outfit.items.map((item) => item.clothingItemId) }))
  return newCombinations(results, existing).slice(0, TRIP_SUGGESTIONS)
}
