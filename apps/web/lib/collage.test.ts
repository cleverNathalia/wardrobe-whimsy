import { describe, expect, it } from 'vitest'
import {
  clamp,
  compactLayers,
  initialPlacement,
  layoutFor,
  normalisePlacement,
  normaliseRotation,
  placementsEqual,
  reorderLayer,
  type CollagePlacement,
} from './collage'
import type { OutfitItemWithClothingItem } from './wardrobe-types'

const placement = (clothingItemId: string, zIndex: number, overrides: Partial<CollagePlacement> = {}) => ({
  clothingItemId,
  positionX: 0.5,
  positionY: 0.5,
  scale: 1,
  rotation: 0,
  zIndex,
  ...overrides,
})

/** Just enough of an outfit row for layoutFor, which only reads the layout. */
const outfitItem = (clothingItemId: string, layout: Partial<CollagePlacement> = {}) =>
  ({
    id: `row-${clothingItemId}`,
    outfitId: 'outfit-1',
    clothingItem: { id: clothingItemId, name: clothingItemId, category: 'Tops', imageUrl: '' },
    ...placement(clothingItemId, 0, { positionX: 0, positionY: 0 }),
    ...layout,
  }) as OutfitItemWithClothingItem

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(2, 0, 1)).toBe(1)
    expect(clamp(0.3, 0, 1)).toBe(0.3)
  })
})

describe('normaliseRotation', () => {
  it('wraps past half a turn instead of clamping', () => {
    expect(normaliseRotation(190)).toBe(-170)
    expect(normaliseRotation(-190)).toBe(170)
    expect(normaliseRotation(360)).toBe(0)
  })

  it('rounds to one decimal place', () => {
    expect(normaliseRotation(12.3456)).toBe(12.3)
  })
})

describe('normalisePlacement', () => {
  it('clamps everything into what the API accepts', () => {
    expect(
      normalisePlacement(placement('a', -2.4, { positionX: -0.2, positionY: 1.7, scale: 10, rotation: 270 }))
    ).toEqual({ clothingItemId: 'a', positionX: 0, positionY: 1, scale: 3, rotation: -90, zIndex: 0 })
  })

  it('rounds pointer-maths noise so an untouched layout still compares equal', () => {
    const noisy = normalisePlacement(placement('a', 1, { positionX: 0.123456789, scale: 1.23456 }))
    expect(noisy.positionX).toBe(0.1235)
    expect(noisy.scale).toBe(1.235)
  })
})

describe('initialPlacement', () => {
  it('deals items into a three-column grid', () => {
    expect(initialPlacement(0)).toMatchObject({ positionX: 1 / 6, positionY: 1 / 6, zIndex: 0 })
    expect(initialPlacement(1)).toMatchObject({ positionX: 0.5, positionY: 1 / 6 })
    expect(initialPlacement(3)).toMatchObject({ positionX: 1 / 6, positionY: 0.5 })
  })

  it('wraps rows so a long outfit never leaves the stage', () => {
    // Index 9 is row 3, which wraps back to the top row.
    expect(initialPlacement(9).positionY).toBe(1 / 6)
  })
})

describe('layoutFor', () => {
  it('deals a never-arranged outfit into the grid instead of a pile at the origin', () => {
    const layout = layoutFor([outfitItem('a'), outfitItem('b')])
    expect(layout.map(({ positionX, positionY }) => [positionX, positionY])).toEqual([
      [1 / 6, 1 / 6],
      [0.5, 1 / 6],
    ])
  })

  it('leaves a single item at the origin alone', () => {
    expect(layoutFor([outfitItem('a')])[0]).toMatchObject({ positionX: 0, positionY: 0 })
  })

  it('keeps a saved arrangement as it is, in paint order', () => {
    const layout = layoutFor([
      outfitItem('top', { positionX: 0.2, positionY: 0.3, zIndex: 1 }),
      outfitItem('bottom', { positionX: 0.6, positionY: 0.7, zIndex: 0 }),
    ])
    expect(layout.map((p) => p.clothingItemId)).toEqual(['bottom', 'top'])
    expect(layout[1]).toMatchObject({ positionX: 0.2, positionY: 0.3 })
  })
})

describe('placementsEqual', () => {
  it('ignores order but notices any changed field', () => {
    const a = [placement('a', 0), placement('b', 1)]
    expect(placementsEqual(a, [a[1], a[0]])).toBe(true)
    expect(placementsEqual(a, [a[0], { ...a[1], rotation: 5 }])).toBe(false)
    expect(placementsEqual(a, [a[0]])).toBe(false)
  })
})

describe('compactLayers', () => {
  it('renumbers layers to 0…n−1 in their visual order', () => {
    const compacted = compactLayers([placement('a', 7), placement('b', 2), placement('c', 40)])
    expect(compacted.map((p) => [p.clothingItemId, p.zIndex])).toEqual([
      ['b', 0],
      ['a', 1],
      ['c', 2],
    ])
  })
})

describe('reorderLayer', () => {
  const stack = [placement('a', 0), placement('b', 1), placement('c', 2)]
  const order = (placements: CollagePlacement[]) =>
    [...placements].sort((x, y) => x.zIndex - y.zIndex).map((p) => p.clothingItemId)

  it('moves an item one step forward or back', () => {
    expect(order(reorderLayer(stack, 'a', 'forward'))).toEqual(['b', 'a', 'c'])
    expect(order(reorderLayer(stack, 'c', 'backward'))).toEqual(['a', 'c', 'b'])
  })

  it('leaves the stack alone at either end, or for an unknown item', () => {
    expect(reorderLayer(stack, 'c', 'forward')).toBe(stack)
    expect(reorderLayer(stack, 'a', 'backward')).toBe(stack)
    expect(reorderLayer(stack, 'nope', 'forward')).toBe(stack)
  })
})
