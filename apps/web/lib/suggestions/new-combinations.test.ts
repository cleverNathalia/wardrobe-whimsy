import { describe, expect, it } from 'vitest'
import { newCombinations, possibleCombinations } from './new-combinations'

const top1 = { id: 't1', category: 'Tops' }
const top2 = { id: 't2', category: 'Long Sleeve Shirts' }
const pants = { id: 'b1', category: 'Pants' }
const skirt = { id: 'b2', category: 'Skirts' }
const dress = { id: 'd1', category: 'Dresses' }
const sandals = { id: 's1', category: 'Footwear' }
const boots = { id: 's2', category: 'Footwear' }

const suggestion = (...items: Array<{ id: string; category: string }>) => ({ items, reason: '' })

describe('newCombinations', () => {
  const trip = [{ itemIds: ['t1', 'b1', 's1'] }, { itemIds: ['d1', 's1'] }]

  it('keeps a top and bottom that are not yet worn together', () => {
    const kept = newCombinations([suggestion(top1, skirt, sandals), suggestion(top2, pants)], trip)
    expect(kept).toHaveLength(2)
  })

  it('drops a pairing the trip already has, even with different shoes', () => {
    expect(newCombinations([suggestion(top1, pants, boots)], trip)).toEqual([])
  })

  it('drops a one-piece already in an outfit', () => {
    expect(newCombinations([suggestion(dress, boots)], trip)).toEqual([])
  })

  it('drops a suggestion with nothing to build an outfit around', () => {
    expect(newCombinations([suggestion(sandals, boots)], [])).toEqual([])
  })

  it('keeps only the first suggestion for each new pairing', () => {
    const kept = newCombinations([suggestion(top2, skirt, sandals), suggestion(top2, skirt, boots)], trip)
    expect(kept).toEqual([suggestion(top2, skirt, sandals)])
  })

  it('keeps everything when the trip has no outfits', () => {
    expect(newCombinations([suggestion(top1, pants), suggestion(dress)], [])).toHaveLength(2)
  })
})

describe('possibleCombinations', () => {
  it('multiplies tops by bottoms and adds one-pieces', () => {
    expect(possibleCombinations({ top: 5, bottom: 3, onePiece: 1 })).toBe(16)
  })

  it('is just the one-pieces with no bottoms', () => {
    expect(possibleCombinations({ top: 4, bottom: 0, onePiece: 2 })).toBe(2)
  })
})
