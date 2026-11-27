import type { Timestamp } from '../wardrobe-types'

/**
 * Trip dates are stored at midnight UTC, so they are formatted in UTC —
 * otherwise a viewer west of Greenwich sees every date a day early.
 */
const day = (value: Timestamp) => new Date(value)

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' })

/** "1–8 Jun 2026", "28 Jun – 3 Jul 2026", "28 Dec 2026 – 3 Jan 2027", or null without dates. */
export function formatTripDates(start: Timestamp | null, end: Timestamp | null): string | null {
  if (!start || !end) return null
  const a = day(start)
  const b = day(end)
  const full = fmt({ day: 'numeric', month: 'short', year: 'numeric' })

  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${full.format(a)} – ${full.format(b)}`
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${fmt({ day: 'numeric', month: 'short' }).format(a)} – ${full.format(b)}`
  }
  if (a.getUTCDate() === b.getUTCDate()) return full.format(a)
  return `${a.getUTCDate()}–${full.format(b)}`
}

/** For `<input type="date">`: `YYYY-MM-DD`, or empty. */
export function toDateInput(value: Timestamp | null): string {
  return value ? day(value).toISOString().slice(0, 10) : ''
}

export const TRIP_STATUS_LABELS = { upcoming: 'Upcoming', now: 'Now', past: 'Past' } as const

/** "5 tops + 3 bottoms + 1 dress → 9 outfits planned" */
export function packingHeadline(baseCounts: { top: number; bottom: number; onePiece: number }, outfitCount: number) {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const parts = [
    baseCounts.top > 0 && plural(baseCounts.top, 'top', 'tops'),
    baseCounts.bottom > 0 && plural(baseCounts.bottom, 'bottom', 'bottoms'),
    baseCounts.onePiece > 0 && plural(baseCounts.onePiece, 'dress or one-piece', 'dresses & one-pieces'),
  ].filter(Boolean)
  const planned = `${plural(outfitCount, 'outfit', 'outfits')} planned`
  return parts.length ? `${parts.join(' + ')} → ${planned}` : planned
}
