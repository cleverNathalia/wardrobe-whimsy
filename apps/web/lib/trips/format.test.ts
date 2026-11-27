import { describe, expect, it } from 'vitest'
import { formatTripDates, packingHeadline, toDateInput } from './format'

const d = (day: string) => new Date(`${day}T00:00:00Z`)

describe('formatTripDates', () => {
  it.each([
    ['2026-06-01', '2026-06-08', '1–8 Jun 2026'],
    ['2026-06-28', '2026-07-03', '28 Jun – 3 Jul 2026'],
    ['2026-12-28', '2027-01-03', '28 Dec 2026 – 3 Jan 2027'],
    ['2026-06-01', '2026-06-01', '1 Jun 2026'],
  ])('%s to %s reads "%s"', (start, end, expected) => {
    expect(formatTripDates(d(start), d(end))).toBe(expected)
  })

  it('accepts dates that came through JSON as strings', () => {
    expect(formatTripDates('2026-06-01T00:00:00.000Z', '2026-06-08T00:00:00.000Z')).toBe('1–8 Jun 2026')
  })

  it('is null without dates', () => {
    expect(formatTripDates(null, null)).toBeNull()
  })
})

describe('toDateInput', () => {
  it('gives the date input form', () => {
    expect(toDateInput(d('2026-06-01'))).toBe('2026-06-01')
    expect(toDateInput(null)).toBe('')
  })
})

describe('packingHeadline', () => {
  it('adds up the outfit bases', () => {
    expect(packingHeadline({ top: 5, bottom: 3, onePiece: 1 }, 9)).toBe(
      '5 tops + 3 bottoms + 1 dress or one-piece → 9 outfits planned'
    )
  })

  it('leaves out groups with nothing in them', () => {
    expect(packingHeadline({ top: 1, bottom: 0, onePiece: 0 }, 1)).toBe('1 top → 1 outfit planned')
  })

  it('still says how many outfits with no bases', () => {
    expect(packingHeadline({ top: 0, bottom: 0, onePiece: 0 }, 0)).toBe('0 outfits planned')
  })
})
