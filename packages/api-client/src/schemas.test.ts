import { describe, expect, it } from 'vitest'
import {
  ClothingItemCreateSchema,
  ColourComboCreateSchema,
  ColourComboUpdateSchema,
  LookCreateSchema,
  OutfitCreateSchema,
  OutfitLayoutEntrySchema,
  SuggestionRequestSchema,
  TripCreateSchema,
  TripItemUpdateSchema,
  TripUpdateSchema,
  WearLogCreateSchema,
  categoryGroup,
} from './schemas'

describe('ClothingItemCreateSchema', () => {
  const valid = { name: 'Linen shirt', category: 'Tops', imageFileId: 'drive-1', imageSource: 'manual' }

  it('accepts the minimum an item needs', () => {
    expect(ClothingItemCreateSchema.safeParse(valid).success).toBe(true)
  })

  it.each(['name', 'category', 'imageFileId'])('requires %s', (field) => {
    expect(ClothingItemCreateSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false)
  })

  it('only accepts the two photo sources', () => {
    expect(ClothingItemCreateSchema.safeParse({ ...valid, imageSource: 'cloudinary' }).success).toBe(false)
  })
})

describe('OutfitCreateSchema', () => {
  it('needs at least one item', () => {
    expect(OutfitCreateSchema.safeParse({ name: 'Brunch', itemIds: [] }).success).toBe(false)
    expect(OutfitCreateSchema.safeParse({ name: 'Brunch', itemIds: ['a'] }).success).toBe(true)
  })
})

describe('OutfitLayoutEntrySchema', () => {
  const entry = { clothingItemId: 'a', positionX: 0.5, positionY: 0.5, scale: 1, rotation: 0, zIndex: 0 }

  it('accepts a placement inside the stage', () => {
    expect(OutfitLayoutEntrySchema.safeParse(entry).success).toBe(true)
  })

  it.each([
    ['a position off the stage', { positionX: 1.1 }],
    ['a scale below the minimum', { scale: 0.1 }],
    ['a scale above the maximum', { scale: 3.5 }],
    ['more than half a turn', { rotation: 181 }],
    ['a fractional layer', { zIndex: 1.5 }],
  ])('rejects %s', (_label, change) => {
    expect(OutfitLayoutEntrySchema.safeParse({ ...entry, ...change }).success).toBe(false)
  })
})

describe('LookCreateSchema', () => {
  it('needs only a photo, and allows no outfit', () => {
    const parsed = LookCreateSchema.parse({ imageFileId: 'drive-1', imageSource: 'manual', outfitId: null })
    expect(parsed.outfitId).toBeNull()
  })
})

describe('WearLogCreateSchema', () => {
  it('reads a date-input value as midnight UTC on that day', () => {
    // The same instant looks store, which is what lets the two be compared by day.
    const { wornAt } = WearLogCreateSchema.parse({ outfitId: 'o1', wornAt: '2026-10-24' })
    expect(wornAt?.toISOString()).toBe('2026-10-24T00:00:00.000Z')
  })

  it('needs an outfit, and caps notes at 500 characters', () => {
    expect(WearLogCreateSchema.safeParse({ wornAt: '2026-10-24' }).success).toBe(false)
    expect(WearLogCreateSchema.safeParse({ outfitId: 'o1', notes: 'x'.repeat(501) }).success).toBe(false)
  })
})

describe('SuggestionRequestSchema', () => {
  it('accepts no filters at all', () => {
    expect(SuggestionRequestSchema.parse({})).toEqual({})
  })

  it('only accepts the known occasions and seasons', () => {
    expect(SuggestionRequestSchema.safeParse({ occasion: 'Work', season: 'Winter' }).success).toBe(true)
    expect(SuggestionRequestSchema.safeParse({ occasion: 'Party' }).success).toBe(false)
    expect(SuggestionRequestSchema.safeParse({ season: 'Monsoon' }).success).toBe(false)
  })

  it('keeps the number of suggestions between 1 and 5', () => {
    expect(SuggestionRequestSchema.safeParse({ limit: 0 }).success).toBe(false)
    expect(SuggestionRequestSchema.safeParse({ limit: 6 }).success).toBe(false)
    expect(SuggestionRequestSchema.safeParse({ limit: 3 }).success).toBe(true)
  })
})

describe('ColourComboCreateSchema', () => {
  const swatch = { hex: '#4F7942', source: 'picker' as const }

  it('needs only colours — the name is optional', () => {
    expect(ColourComboCreateSchema.safeParse({ swatches: [swatch] }).success).toBe(true)
  })

  it('stores hex in lower case, so equal colours compare equal', () => {
    expect(ColourComboCreateSchema.parse({ swatches: [swatch] }).swatches[0].hex).toBe('#4f7942')
  })

  it.each(['4f7942', '#4f794', '#4f79422', '#zzzzzz', 'green'])('rejects %s as a colour', (hex) => {
    expect(ColourComboCreateSchema.safeParse({ swatches: [{ ...swatch, hex }] }).success).toBe(false)
  })

  it('needs between one and twelve colours', () => {
    expect(ColourComboCreateSchema.safeParse({ swatches: [] }).success).toBe(false)
    expect(ColourComboCreateSchema.safeParse({ swatches: Array(13).fill(swatch) }).success).toBe(false)
  })

  it('only accepts the two swatch sources', () => {
    expect(ColourComboCreateSchema.safeParse({ swatches: [{ ...swatch, source: 'ai' }] }).success).toBe(false)
  })

  it('lets an update change one field without resending the rest', () => {
    expect(ColourComboUpdateSchema.parse({ name: 'Autumn' })).toEqual({ name: 'Autumn' })
  })
})

describe('categoryGroup', () => {
  it.each([
    ['Long Sleeve Shirts', 'top'],
    ['Sweatpants', 'bottom'],
    ['Suits', 'onePiece'],
    ['Footwear', 'shoes'],
    ['Swimwear', 'other'],
    ['Something new', 'other'],
  ])('puts %s in %s', (category, group) => {
    expect(categoryGroup(category)).toBe(group)
  })
})

describe('TripCreateSchema', () => {
  const valid = { name: 'Italy 2026' }

  it('needs only a name', () => {
    expect(TripCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('reads date strings as midnight UTC', () => {
    const parsed = TripCreateSchema.parse({ ...valid, startDate: '2026-06-01', endDate: '2026-06-08' })
    expect(parsed.startDate?.toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('rejects one date without the other', () => {
    expect(TripCreateSchema.safeParse({ ...valid, startDate: '2026-06-01' }).success).toBe(false)
  })

  it('rejects a trip that ends before it starts', () => {
    expect(TripCreateSchema.safeParse({ ...valid, startDate: '2026-06-08', endDate: '2026-06-01' }).success).toBe(false)
  })

  it('accepts a one-day trip', () => {
    expect(TripCreateSchema.safeParse({ ...valid, startDate: '2026-06-01', endDate: '2026-06-01' }).success).toBe(true)
  })

  it('accepts limits per packing group, and rejects unknown groups and zero', () => {
    expect(TripCreateSchema.safeParse({ ...valid, limits: { top: 5, shoes: 2 } }).success).toBe(true)
    expect(TripCreateSchema.safeParse({ ...valid, limits: { socks: 5 } }).success).toBe(false)
    expect(TripCreateSchema.safeParse({ ...valid, limits: { top: 0 } }).success).toBe(false)
  })
})

describe('TripUpdateSchema', () => {
  it('allows leaving the dates alone', () => {
    expect(TripUpdateSchema.safeParse({ name: 'Rome' }).success).toBe(true)
  })

  it('still sends the dates together', () => {
    expect(TripUpdateSchema.safeParse({ endDate: '2026-06-08' }).success).toBe(false)
    expect(TripUpdateSchema.safeParse({ startDate: null, endDate: null }).success).toBe(true)
  })
})

describe('TripItemUpdateSchema', () => {
  it('needs isLoose or packed', () => {
    expect(TripItemUpdateSchema.safeParse({}).success).toBe(false)
    expect(TripItemUpdateSchema.safeParse({ packed: true }).success).toBe(true)
  })
})
