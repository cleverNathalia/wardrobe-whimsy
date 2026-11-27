import { describe, expect, it } from 'vitest'
import {
  buildPackingList,
  buildTripRecap,
  tripDays,
  tripStatus,
  type PackingSourceItem,
  type PackingSourceOutfit,
} from './packing-list'

const item = (id: string, category: string): PackingSourceItem => ({ id, name: id, category, imageUrl: `/img/${id}` })
const outfit = (id: string, ...items: PackingSourceItem[]): PackingSourceOutfit => ({ id, name: id, items })

const linen = item('linen-shirt', 'Tops')
const tee = item('striped-tee', 'Tops')
const cami = item('black-cami', 'Tops')
const trousers = item('beige-trousers', 'Pants')
const skirt = item('denim-skirt', 'Skirts')
const dress = item('sun-dress', 'Dresses')
const sandals = item('sandals', 'Footwear')
const swimsuit = item('swimsuit', 'Swimwear')

const italy = [
  outfit('o1', linen, trousers, sandals),
  outfit('o2', linen, skirt, sandals),
  outfit('o3', tee, trousers),
  outfit('o4', tee, skirt),
  outfit('o5', cami, trousers),
  outfit('o6', dress, sandals),
]

const group = (list: ReturnType<typeof buildPackingList>, name: string) =>
  list.groups.find((g) => g.group === name)!

describe('buildPackingList', () => {
  it('lists each item once, with the outfits that use it', () => {
    const list = buildPackingList(italy, [])
    const tops = group(list, 'top')

    expect(tops.items.map((i) => [i.id, i.outfitIds])).toEqual([
      ['linen-shirt', ['o1', 'o2']],
      ['striped-tee', ['o3', 'o4']],
      ['black-cami', ['o5']],
    ])
    expect(list.itemCount).toBe(7)
    expect(list.outfitCount).toBe(6)
  })

  it('groups categories, in packing-list order, and leaves out empty groups', () => {
    const list = buildPackingList(italy, [{ item: swimsuit, isLoose: true, packed: false }])
    expect(list.groups.map((g) => g.group)).toEqual(['top', 'bottom', 'onePiece', 'shoes', 'other'])
    expect(list.baseCounts).toEqual({ top: 3, bottom: 2, onePiece: 1 })
  })

  it('flags items in exactly one outfit as weak links', () => {
    const list = buildPackingList(italy, [])
    const weak = list.groups.flatMap((g) => g.items).filter((i) => i.weakLink).map((i) => i.id)
    expect(weak).toEqual(['black-cami', 'sun-dress'])
  })

  it('counts an item once per outfit, even if the outfit lists it twice', () => {
    const list = buildPackingList([outfit('o1', linen, linen, trousers)], [])
    expect(group(list, 'top').items[0].outfitIds).toEqual(['o1'])
  })

  describe('limits', () => {
    it('is within the limit at exactly the limit', () => {
      const list = buildPackingList(italy, [], { top: 3 })
      expect(group(list, 'top').limit).toBe(3)
      expect(group(list, 'top').overflowItemIds).toEqual([])
    })

    it('names the items past the limit, in the order the outfits brought them', () => {
      const list = buildPackingList(italy, [], { top: 2 })
      expect(group(list, 'top').overflowItemIds).toEqual(['black-cami'])
    })

    it('counts loose items after outfit items', () => {
      const extraTop = item('white-tee', 'Tops')
      const list = buildPackingList(italy, [{ item: extraTop, isLoose: true, packed: false }], { top: 3 })
      expect(group(list, 'top').overflowItemIds).toEqual(['white-tee'])
    })

    it('has no limit for a group left out', () => {
      const list = buildPackingList(italy, [], { top: 1 })
      expect(group(list, 'bottom').limit).toBeNull()
      expect(group(list, 'bottom').overflowItemIds).toEqual([])
    })
  })

  describe('trip items', () => {
    it('adds loose items that are in no outfit', () => {
      const list = buildPackingList(italy, [{ item: swimsuit, isLoose: true, packed: false }])
      const entry = group(list, 'other').items[0]
      expect(entry).toMatchObject({ id: 'swimsuit', loose: true, outfitIds: [], weakLink: false, orphanedPacked: false })
    })

    it('marks packed items and counts them', () => {
      const list = buildPackingList(italy, [
        { item: linen, isLoose: false, packed: true },
        { item: sandals, isLoose: false, packed: true },
      ])
      expect(list.packedCount).toBe(2)
      expect(group(list, 'top').items.find((i) => i.id === 'linen-shirt')?.packed).toBe(true)
    })

    it('keeps a packed item whose outfits were all removed, flagged as orphaned', () => {
      const withoutCami = italy.filter((o) => o.id !== 'o5')
      const list = buildPackingList(withoutCami, [{ item: cami, isLoose: false, packed: true }])
      const entry = group(list, 'top').items.find((i) => i.id === 'black-cami')
      expect(entry).toMatchObject({ packed: true, orphanedPacked: true, outfitIds: [] })
    })

    it('does not call a packed loose item orphaned', () => {
      const list = buildPackingList([], [{ item: swimsuit, isLoose: true, packed: true }])
      expect(group(list, 'other').items[0].orphanedPacked).toBe(false)
    })

    it('lets an item be loose and in outfits at once', () => {
      const list = buildPackingList(italy, [{ item: sandals, isLoose: true, packed: false }])
      const entry = group(list, 'shoes').items[0]
      expect(entry.loose).toBe(true)
      expect(entry.outfitIds).toEqual(['o1', 'o2', 'o6'])
      expect(list.itemCount).toBe(7)
    })
  })

  it('handles an empty trip', () => {
    expect(buildPackingList([], [])).toEqual({
      groups: [],
      itemCount: 0,
      packedCount: 0,
      outfitCount: 0,
      baseCounts: { top: 0, bottom: 0, onePiece: 0 },
    })
  })
})

describe('tripStatus', () => {
  const june1 = new Date('2026-06-01T00:00:00Z')
  const june8 = new Date('2026-06-08T00:00:00Z')

  it.each([
    ['2026-05-31', 'upcoming'],
    ['2026-06-01', 'now'],
    ['2026-06-08', 'now'],
    ['2026-06-09', 'past'],
  ])('on %s the trip is %s', (today, status) => {
    expect(tripStatus(june1, june8, today)).toBe(status)
  })

  it('treats a trip without dates as upcoming', () => {
    expect(tripStatus(null, null, '2030-01-01')).toBe('upcoming')
  })
})

describe('tripDays', () => {
  it('counts both ends', () => {
    expect(tripDays(new Date('2026-06-01T00:00:00Z'), new Date('2026-06-08T00:00:00Z'))).toBe(8)
    expect(tripDays(new Date('2026-06-01T00:00:00Z'), new Date('2026-06-01T00:00:00Z'))).toBe(1)
  })

  it('is null without dates', () => {
    expect(tripDays(null, null)).toBeNull()
  })
})

describe('buildTripRecap', () => {
  const list = buildPackingList(italy, [{ item: swimsuit, isLoose: true, packed: true }])
  const outfitIds = italy.map((o) => o.id)

  it('counts the outfits worn', () => {
    const recap = buildTripRecap(list, outfitIds, new Set(['o1', 'o3', 'o6']))
    expect(recap.wornOutfitCount).toBe(3)
    expect(recap.outfitCount).toBe(6)
  })

  it('lists items none of whose outfits were worn, and leaves out loose items', () => {
    const recap = buildTripRecap(list, outfitIds, new Set(['o1', 'o3', 'o6']))
    // The skirt's outfits are o2 and o4; neither was worn. The swimsuit is loose, so left out.
    expect(recap.unwornItems.map((i) => i.id)).toEqual(['black-cami', 'denim-skirt'])
  })

  it('ignores worn outfits that are not on the trip', () => {
    const recap = buildTripRecap(list, outfitIds, new Set(['elsewhere']))
    expect(recap.wornOutfitCount).toBe(0)
  })
})
