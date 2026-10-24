import type { OutfitSuggester, OutfitSuggestion, SuggestionCandidate, SuggestionRequest } from './types'

/**
 * The placeholder suggester. No model and no outside service, both out of
 * scope for this version: it fills outfit "slots" from category lists, keeps
 * to the requested occasion and season, and prefers items not worn lately.
 * Deliberately simple — it exists so the interface and UI can be built and
 * used now, and replaced without touching either.
 */
const SLOTS = {
  top: ['Tops', 'Bodysuits', 'Sweaters', 'Sweatshirts'],
  bottom: ['Jeans', 'Pants', 'Shorts', 'Skirts'],
  onePiece: ['Dresses', 'Jumpsuits', 'Rompers', 'Overalls', 'Suits'],
  shoes: ['Footwear'],
  layer: ['Jackets', 'Coats', 'Blazers', 'Cardigans', 'Shrugs', 'Vests'],
  accessory: ['Bags', 'Jewelry', 'Scarves', 'Hats', 'Belts', 'Glasses', 'Hair Accessories', 'Other Accessories'],
} as const

const COLD_SEASONS = new Set(['Autumn', 'Winter'])
const DEFAULT_LIMIT = 3

/** An item with no occasion or season set is taken to suit any. */
function suits(item: SuggestionCandidate, request: SuggestionRequest): boolean {
  const occasionOk = !request.occasion || !item.occasion || item.occasion === request.occasion
  const seasonOk =
    !request.season ||
    request.season === 'All seasons' ||
    !item.season ||
    item.season === 'All seasons' ||
    item.season === request.season
  return occasionOk && seasonOk
}

/** Never-worn first, then longest since worn; random among equals, for variety. */
function freshestFirst(items: SuggestionCandidate[]): SuggestionCandidate[] {
  return items
    .map((item) => ({ item, tiebreak: Math.random() }))
    .sort(
      (a, b) =>
        (a.item.lastWorn ?? '').localeCompare(b.item.lastWorn ?? '') || a.tiebreak - b.tiebreak
    )
    .map(({ item }) => item)
}

function describe(base: 'separates' | 'onePiece', picked: SuggestionCandidate[], request: SuggestionRequest): string {
  const forWhat = [request.occasion?.toLowerCase(), request.season && request.season !== 'All seasons' ? request.season.toLowerCase() : null]
    .filter(Boolean)
    .join(', ')
  const shape = base === 'separates' ? 'Separates' : 'A one-piece'
  const freshness = picked.some((item) => item.lastWorn === null)
    ? "Includes something you haven't worn yet."
    : "Favours what you haven't worn lately."

  return `${shape}${forWhat ? ` for ${forWhat}` : ''}. ${freshness}`
}

export const ruleBasedSuggester: OutfitSuggester = {
  async suggest(candidates, request) {
    const suitable = candidates.filter((item) => suits(item, request))
    const pool = (categories: readonly string[]) =>
      freshestFirst(suitable.filter((item) => categories.includes(item.category)))

    const tops = pool(SLOTS.top)
    const bottoms = pool(SLOTS.bottom)
    const onePieces = pool(SLOTS.onePiece)
    const shoes = pool(SLOTS.shoes)
    const layers = pool(SLOTS.layer)
    const accessories = pool(SLOTS.accessory)

    const bases: Array<'separates' | 'onePiece'> = []
    if (tops.length && bottoms.length) bases.push('separates')
    if (onePieces.length) bases.push('onePiece')
    if (bases.length === 0) return []

    const wantLayer = request.season ? COLD_SEASONS.has(request.season) : false
    const limit = request.limit ?? DEFAULT_LIMIT
    const nth = <T>(list: T[], i: number): T | undefined => (list.length ? list[i % list.length] : undefined)

    const suggestions: OutfitSuggestion[] = []
    const seen = new Set<string>()
    let separatesRounds = 0
    let onePieceRounds = 0

    // Each round takes the next-freshest item for every slot, so suggestions
    // differ; rounds that repeat an earlier combination are skipped.
    for (let round = 0; suggestions.length < limit && round < limit * 4; round++) {
      const base = bases[round % bases.length]

      let core: Array<SuggestionCandidate | undefined>
      if (base === 'separates') {
        const k = separatesRounds++
        // The bottom shifts by one each time the tops wrap around, so with two
        // tops and two bottoms all four pairings come up, not just two.
        core = [nth(tops, k), nth(bottoms, k + Math.floor(k / tops.length))]
      } else {
        core = [nth(onePieces, onePieceRounds++)]
      }

      const picked = [
        ...core,
        nth(shoes, round),
        wantLayer ? nth(layers, round) : undefined,
        nth(accessories, round),
      ].filter((item): item is SuggestionCandidate => item !== undefined)

      const key = picked.map((item) => item.id).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)

      suggestions.push({ itemIds: picked.map((item) => item.id), reason: describe(base, picked, request) })
    }

    return suggestions
  },
}
