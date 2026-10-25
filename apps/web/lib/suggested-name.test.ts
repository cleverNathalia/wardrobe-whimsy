import { describe, expect, it } from 'vitest'
import { nextSequentialName } from './suggested-name'

describe('nextSequentialName', () => {
  it('starts at 001', () => {
    expect(nextSequentialName('item', [])).toBe('item-001')
  })

  it('follows the highest number, so a deleted gap is never handed out again', () => {
    expect(nextSequentialName('item', ['item-001', 'item-004'])).toBe('item-005')
  })

  it('ignores names the user wrote themselves, and the other prefix', () => {
    expect(nextSequentialName('outfit', ['Summer brunch', 'item-009', 'outfit-002'])).toBe('outfit-003')
  })

  it('matches regardless of case and surrounding spaces', () => {
    expect(nextSequentialName('item', ['  ITEM-012 '])).toBe('item-013')
  })

  it('grows past three digits rather than wrapping', () => {
    expect(nextSequentialName('item', ['item-999'])).toBe('item-1000')
  })
})
