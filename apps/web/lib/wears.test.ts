import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The queries are replaced with fixed rows, so these tests cover what happens
 * to the rows: counting a day once, months, rankings and the 60-day cutoff.
 * The WHERE clauses themselves are not exercised here.
 */
const db = vi.hoisted(() => ({
  wardrobe: { findUnique: vi.fn() },
  clothingItem: { findMany: vi.fn() },
  outfit: { findMany: vi.fn() },
  wearLog: { findMany: vi.fn() },
  look: { findMany: vi.fn() },
}))
vi.mock('./prisma', () => ({ prisma: db }))

import { getDashboardStats, getItemLastWornDays, getOutfitWearHistory } from './wears'
import { WardrobeNotFoundError } from './wardrobe-db'

const day = (iso: string) => new Date(`${iso}T00:00:00Z`)

const OUTFITS = [
  { id: 'brunch', name: 'Brunch', items: [{ clothingItemId: 'tee' }, { clothingItemId: 'jeans' }] },
  { id: 'work', name: 'Work', items: [{ clothingItemId: 'jeans' }, { clothingItemId: 'blazer' }] },
  { id: 'unworn', name: 'Unworn', items: [{ clothingItemId: 'old-scarf' }] },
]

const ITEMS = [
  { id: 'tee', name: 'Tee', imageFileId: 'f-tee', createdAt: day('2026-01-01') },
  { id: 'jeans', name: 'Jeans', imageFileId: 'f-jeans', createdAt: day('2026-01-01') },
  { id: 'blazer', name: 'Blazer', imageFileId: 'f-blazer', createdAt: day('2026-10-20') },
  { id: 'old-scarf', name: 'Old scarf', imageFileId: 'f-scarf', createdAt: day('2026-01-01') },
  // Added recently and never worn: not yet "forgotten".
  { id: 'new-bag', name: 'New bag', imageFileId: 'f-bag', createdAt: day('2026-10-01') },
]

const WEAR_LOGS = [
  { id: 'log-1', outfitId: 'brunch', wornAt: day('2026-10-24'), notes: null },
  // Logged twice on the same day: still one wear.
  { id: 'log-2', outfitId: 'brunch', wornAt: day('2026-10-24'), notes: null },
  { id: 'log-3', outfitId: 'brunch', wornAt: day('2026-09-15'), notes: 'Picnic' },
  { id: 'log-4', outfitId: 'work', wornAt: day('2026-10-02'), notes: null },
]

const LOOKS = [
  // Same outfit and day as a wear log: counted once with it.
  { id: 'look-1', outfitId: 'brunch', wornAt: day('2026-10-24'), notes: null, imageFileId: 'f-look-1' },
  { id: 'look-2', outfitId: 'work', wornAt: day('2026-07-01'), notes: null, imageFileId: 'f-look-2' },
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))

  db.wardrobe.findUnique.mockResolvedValue({ id: 'w1', userId: 'user-1' })
  db.clothingItem.findMany.mockResolvedValue(ITEMS)
  db.outfit.findMany.mockResolvedValue(OUTFITS)
  db.wearLog.findMany.mockResolvedValue(WEAR_LOGS)
  db.look.findMany.mockResolvedValue(LOOKS)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('getDashboardStats', () => {
  it('refuses a wardrobe that belongs to someone else', async () => {
    await expect(getDashboardStats('w1', 'someone-else')).rejects.toBeInstanceOf(WardrobeNotFoundError)
  })

  it('counts an outfit once per day, however many logs and looks record it', async () => {
    const { totals } = await getDashboardStats('w1', 'user-1')
    // October: brunch on the 24th (two logs + a look) and work on the 2nd.
    expect(totals.wearsThisMonth).toBe(2)
    expect(totals.wearsLastMonth).toBe(1)
  })

  it('totals active items and outfits', async () => {
    const { totals } = await getDashboardStats('w1', 'user-1')
    expect(totals.items).toBe(5)
    expect(totals.outfits).toBe(3)
  })

  it('lists recent wears newest first', async () => {
    const { recentlyWorn } = await getDashboardStats('w1', 'user-1')
    expect(recentlyWorn.map((w) => `${w.outfitName} ${w.day}`)).toEqual([
      'Brunch 2026-10-24',
      'Work 2026-10-02',
      'Brunch 2026-09-15',
      'Work 2026-07-01',
    ])
  })

  it('ranks outfits by wears, breaking ties by the most recent', async () => {
    const { mostWornOutfits } = await getDashboardStats('w1', 'user-1')
    expect(mostWornOutfits).toEqual([
      { outfitId: 'brunch', name: 'Brunch', count: 2, lastWorn: '2026-10-24' },
      { outfitId: 'work', name: 'Work', count: 2, lastWorn: '2026-10-02' },
    ])
  })

  it('credits items through the outfits they are in', async () => {
    const { mostWornItems } = await getDashboardStats('w1', 'user-1')
    expect(mostWornItems.map((i) => [i.itemId, i.count, i.lastWorn])).toEqual([
      ['jeans', 4, '2026-10-24'],
      ['tee', 2, '2026-10-24'],
      ['blazer', 2, '2026-10-02'],
    ])
    expect(mostWornItems[0].imageUrl).toBe('/api/drive/image/f-jeans')
  })

  it('flags items unworn for 60+ days, but not ones added recently', async () => {
    const { notWornLately } = await getDashboardStats('w1', 'user-1')
    expect(notWornLately.total).toBe(1)
    expect(notWornLately.items).toEqual([
      { itemId: 'old-scarf', name: 'Old scarf', imageUrl: '/api/drive/image/f-scarf', lastWorn: null },
    ])
  })
})

describe('getOutfitWearHistory', () => {
  it('lists every log and look, but counts distinct days', async () => {
    db.wearLog.findMany.mockResolvedValue(WEAR_LOGS.filter((log) => log.outfitId === 'brunch'))
    db.look.findMany.mockResolvedValue(LOOKS.filter((look) => look.outfitId === 'brunch'))

    const { timesWorn, entries } = await getOutfitWearHistory('w1', 'user-1', 'brunch')

    expect(timesWorn).toBe(2)
    expect(entries).toHaveLength(4)
    expect(entries.map((e) => e.day)).toEqual(['2026-10-24', '2026-10-24', '2026-10-24', '2026-09-15'])
    expect(entries.find((e) => e.kind === 'look')).toMatchObject({ imageUrl: '/api/drive/image/f-look-1' })
  })
})

describe('getItemLastWornDays', () => {
  it('maps each worn item to its latest day, leaving unworn items out', async () => {
    const lastWorn = await getItemLastWornDays('w1')
    expect(Object.fromEntries(lastWorn)).toEqual({
      tee: '2026-10-24',
      jeans: '2026-10-24',
      blazer: '2026-10-02',
    })
  })
})
