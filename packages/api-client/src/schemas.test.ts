import { describe, expect, it } from 'vitest'
import {
  ClothingItemCreateSchema,
  ColourComboCreateSchema,
  ColourComboUpdateSchema,
  LookCreateSchema,
  OutfitCreateSchema,
  OutfitLayoutEntrySchema,
  SuggestionRequestSchema,
  WearLogCreateSchema,
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
