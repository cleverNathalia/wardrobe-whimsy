import { describe, expect, it } from 'vitest'
import { comboDisplayName, nearestColourName } from './colour-names'

describe('nearestColourName', () => {
  it('names a colour that is in the list exactly', () => {
    expect(nearestColourName('#000000')).toBe('Black')
    expect(nearestColourName('#1f2a44')).toBe('Navy')
    expect(nearestColourName('#e1ad01')).toBe('Mustard')
  })

  it('finds the nearest name for a colour that is not', () => {
    expect(nearestColourName('#fefefe')).toBe('White')
    expect(nearestColourName('#20305a')).toBe('Navy')
    expect(nearestColourName('#3aa020')).toBe('Green')
  })

  it('accepts upper-case hex', () => {
    expect(nearestColourName('#FFFFFF')).toBe('White')
  })
})

describe('comboDisplayName', () => {
  it("uses the combo's own name when it has one", () => {
    expect(comboDisplayName('  Autumn walk ', ['#000000'])).toBe('Autumn walk')
  })

  it('falls back to its colour names, in swatch order', () => {
    expect(comboDisplayName(null, ['#1f2a44', '#e1ad01', '#f5f0dc'])).toBe('Navy, Mustard, Cream')
  })

  it('names two shades of the same colour once', () => {
    expect(comboDisplayName('', ['#1f2a44', '#20305a', '#ffffff'])).toBe('Navy, White')
  })

  it('shows at most three names, then a count', () => {
    expect(comboDisplayName(null, ['#000000', '#ffffff', '#d0312d', '#3a9d23', '#1f5fbf'])).toBe(
      'Black, White, Red +2'
    )
  })

  it('has something to say for an empty combo', () => {
    expect(comboDisplayName(undefined, [])).toBe('Untitled combo')
  })
})
