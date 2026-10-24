import { ruleBasedSuggester } from './rule-based'
import type { OutfitSuggester } from './types'

export type { OutfitSuggester, OutfitSuggestion, SuggestionCandidate, SuggestionRequest } from './types'

/**
 * The one place that decides which suggester the app uses. Replace this with
 * a real implementation of OutfitSuggester; nothing else needs to change.
 */
export const outfitSuggester: OutfitSuggester = ruleBasedSuggester
