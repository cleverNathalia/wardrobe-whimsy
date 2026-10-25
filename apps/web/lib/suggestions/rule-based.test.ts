import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ruleBasedSuggester } from './rule-based'
import type { SuggestionCandidate } from './types'

const item = (id: string, category: string, extra: Partial<SuggestionCandidate> = {}): SuggestionCandidate => ({
  id,
  category,
  colour: null,
  season: null,
  occasion: null,
  lastWorn: null,
  ...extra,
})

const suggest = (items: SuggestionCandidate[], request = {}) => ruleBasedSuggester.suggest(items, request)

describe('ruleBasedSuggester', () => {
  // Ties are broken at random for variety; pin it so results are repeatable.
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('suggests nothing without a top and bottom or a one-piece', async () => {
    expect(await suggest([item('shoes', 'Footwear'), item('top', 'Tops')])).toEqual([])
  })

  it('builds separates with shoes and an accessory', async () => {
    const [first] = await suggest([
      item('top', 'Tops'),
      item('jeans', 'Jeans'),
      item('sneakers', 'Footwear'),
      item('bag', 'Bags'),
    ])
    expect(first.itemIds).toEqual(['top', 'jeans', 'sneakers', 'bag'])
  })

  it('adds a layer only when a cold season is asked for', async () => {
    const items = [item('dress', 'Dresses'), item('coat', 'Coats')]
    expect((await suggest(items))[0].itemIds).toEqual(['dress'])
    expect((await suggest(items, { season: 'Winter' }))[0].itemIds).toEqual(['dress', 'coat'])
    expect((await suggest(items, { season: 'Summer' }))[0].itemIds).toEqual(['dress'])
  })

  it('keeps to the requested occasion, treating unset as suiting any', async () => {
    const results = await suggest(
      [
        item('blouse', 'Tops', { occasion: 'Work' }),
        item('tee', 'Tops', { occasion: 'Casual' }),
        item('trousers', 'Pants'),
      ],
      { occasion: 'Work' }
    )
    expect(results.map((r) => r.itemIds)).toEqual([['blouse', 'trousers']])
  })

  it('treats "All seasons" as suiting any season', async () => {
    const results = await suggest([item('dress', 'Dresses', { season: 'All seasons' })], { season: 'Summer' })
    expect(results).toHaveLength(1)
  })

  it('prefers items never worn, then the longest since worn', async () => {
    const results = await suggest(
      [
        item('worn-yesterday', 'Tops', { lastWorn: '2026-10-24' }),
        item('worn-ages-ago', 'Tops', { lastWorn: '2026-01-01' }),
        item('never-worn', 'Tops'),
        item('jeans', 'Jeans'),
      ],
      { limit: 3 }
    )
    expect(results.map((r) => r.itemIds[0])).toEqual(['never-worn', 'worn-ages-ago', 'worn-yesterday'])
  })

  it('pairs every top with every bottom before repeating', async () => {
    const results = await suggest(
      [item('t1', 'Tops'), item('t2', 'Tops'), item('b1', 'Jeans'), item('b2', 'Skirts')],
      { limit: 4 }
    )
    const pairs = results.map((r) => r.itemIds.join('+'))
    expect(new Set(pairs).size).toBe(4)
  })

  it('never returns the same combination twice, even if that means fewer than asked', async () => {
    const results = await suggest([item('dress', 'Dresses')], { limit: 3 })
    expect(results).toHaveLength(1)
  })

  it('alternates separates and one-pieces when both are possible', async () => {
    const results = await suggest([item('top', 'Tops'), item('jeans', 'Jeans'), item('dress', 'Dresses')])
    expect(results.map((r) => r.itemIds)).toEqual([['top', 'jeans'], ['dress']])
  })

  it('explains the suggestion in terms of what was asked', async () => {
    const [first] = await suggest([item('dress', 'Dresses')], { occasion: 'Evening', season: 'Winter' })
    expect(first.reason).toBe("A one-piece for evening, winter. Includes something you haven't worn yet.")
  })
})
