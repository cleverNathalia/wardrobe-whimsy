/** How many digits the suffix is padded to. Numbers past 999 simply get longer. */
const SUFFIX_DIGITS = 3

/**
 * The next free `prefix-NNN` given the names already in use.
 *
 * Based on the highest number taken, not on how many names exist: deleting
 * `item-003` and adding another item must not hand out `item-003` a second
 * time. Names the user has written themselves are ignored, since they do not
 * match the pattern.
 *
 * Pure so the numbering rule can be reasoned about (and tested) without a
 * database; the queries live in `wardrobe-db.ts`.
 */
export function nextSequentialName(prefix: 'item' | 'outfit', existingNames: string[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i')

  const highest = existingNames.reduce((max, name) => {
    const match = pattern.exec(name.trim())
    if (!match) return max

    const value = Number.parseInt(match[1], 10)
    return Number.isFinite(value) && value > max ? value : max
  }, 0)

  return `${prefix}-${String(highest + 1).padStart(SUFFIX_DIGITS, '0')}`
}
