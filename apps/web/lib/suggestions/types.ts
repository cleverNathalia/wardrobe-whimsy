import type { SuggestionRequest } from '@wardrobe-whimsy/api-client'

export type { SuggestionRequest }

/** What a suggester knows about each ACTIVE item it can choose from. */
export interface SuggestionCandidate {
  id: string
  category: string
  colour: string | null
  season: string | null
  occasion: string | null
  /** `YYYY-MM-DD` of the most recent wear, or null if never worn. */
  lastWorn: string | null
}

export interface OutfitSuggestion {
  /** The items to wear together, in no particular order. */
  itemIds: string[]
  /** One sentence shown under the suggestion, saying why it was picked. */
  reason: string
}

/**
 * The contract for outfit suggestions (FR-7.1): given a user's ACTIVE items
 * and what they asked for, return suggested outfits, best first.
 *
 * Swapping in a real model means writing another implementation of this and
 * changing the export in `./index.ts` — the API route and UI only ever see
 * this interface (FR-7.2).
 */
export interface OutfitSuggester {
  suggest(candidates: SuggestionCandidate[], request: SuggestionRequest): Promise<OutfitSuggestion[]>
}
