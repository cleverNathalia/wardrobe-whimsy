import { ruleBasedSuggester } from './rule-based'
import type { OutfitSuggester } from './types'

export type { OutfitSuggester, OutfitSuggestion, SuggestionCandidate, SuggestionRequest } from './types'

/**
 * The one place that decides which suggester the app uses. Replace this with
 * a real implementation of OutfitSuggester; nothing else needs to change.
 */
export const outfitSuggester: OutfitSuggester = ruleBasedSuggester

/**
 * Outfit suggestions are hidden from the app for now (2026-11-27): the "Suggest an
 * outfit" button is gone and `/outfits/suggest` sends you back to Outfits. The
 * suggester and `/api/suggestions` are untouched. Set to true to bring them back.
 */
export const SHOW_OUTFIT_SUGGESTIONS = false
