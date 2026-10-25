import { describe, expect, it } from 'vitest'
import { formatWearDay } from './wear-day'

describe('formatWearDay', () => {
  it('formats the stored calendar day as written', () => {
    expect(formatWearDay('2026-10-24')).toBe('24 October 2026')
  })

  it('does not slip to the previous day at the start of a month or year', () => {
    // Read in local time, midnight UTC is still the day before anywhere west
    // of Greenwich — the bug this formatter exists to avoid.
    expect(formatWearDay('2027-01-01')).toBe('1 January 2027')
  })
})
