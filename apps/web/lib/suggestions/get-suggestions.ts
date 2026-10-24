import { listClothingItems } from '../wardrobe-db'
import { getItemLastWornDays } from '../wears'
import type { ClothingItem } from '../wardrobe-types'
import { outfitSuggester, type SuggestionRequest } from '.'

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
