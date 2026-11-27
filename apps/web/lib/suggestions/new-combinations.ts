import { categoryGroup } from '@wardrobe-whimsy/api-client'

/** The pieces an outfit is built around: a top and bottom, or a one-piece. */
const BASE_GROUPS = new Set(['top', 'bottom', 'onePiece'])

/**
 * Keeps the suggestions that are new to a trip: ones whose base pieces don't
 * already appear together in one of its outfits. A different pair of shoes on
 * the same top and bottom isn't a new outfit for packing purposes, so only the
 * base counts — which is also why only the first suggestion with a given base
 * is kept. A suggestion with no base pieces is dropped too.
 */
export function newCombinations<T extends { items: Array<{ id: string; category: string }> }>(
  suggestions: T[],
  existingOutfits: Array<{ itemIds: string[] }>
): T[] {
  const existing = existingOutfits.map((outfit) => new Set(outfit.itemIds))
  const seenBases = new Set<string>()

  return suggestions.filter((suggestion) => {
    const base = suggestion.items.filter((item) => BASE_GROUPS.has(categoryGroup(item.category)))
    if (base.length === 0) return false
    if (existing.some((outfit) => base.every((item) => outfit.has(item.id)))) return false

    const key = base.map((item) => item.id).sort().join('|')
    if (seenBases.has(key)) return false
    seenBases.add(key)
    return true
  })
}

/**
 * Every top with every bottom, plus each one-piece on its own: the most
 * distinct outfits these items can make, ignoring shoes and extras.
 */
export function possibleCombinations(baseCounts: { top: number; bottom: number; onePiece: number }): number {
  return baseCounts.top * baseCounts.bottom + baseCounts.onePiece
}
