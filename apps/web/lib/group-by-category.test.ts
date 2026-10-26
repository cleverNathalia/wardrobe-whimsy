import { describe, expect, it } from 'vitest'
import { groupByCategory } from './group-by-category'

const item = (id: string, category: string) => ({ id, category })

describe('groupByCategory', () => {
  it('puts categories in A–Z order', () => {
    const groups = groupByCategory([item('1', 'Tops'), item('2', 'Bags'), item('3', 'Jeans')])
    expect(groups.map((g) => g.category)).toEqual(['Bags', 'Jeans', 'Tops'])
  })

  it('keeps upload order within each category', () => {
    // Newest first, as the wardrobe page loads them.
    const groups = groupByCategory([item('new-top', 'Tops'), item('bag', 'Bags'), item('old-top', 'Tops')])
    expect(groups.find((g) => g.category === 'Tops')?.items.map((i) => i.id)).toEqual(['new-top', 'old-top'])
  })

  it('returns no groups for no items', () => {
    expect(groupByCategory([])).toEqual([])
  })
})
