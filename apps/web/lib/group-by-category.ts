/**
 * One section per category, in A–Z order to match the category filter.
 * Items keep the order they came in within each section — for the wardrobe,
 * newest first.
 */
export function groupByCategory<T extends { category: string }>(
  items: T[]
): Array<{ category: string; items: T[] }> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const group = groups.get(item.category)
    if (group) group.push(item)
    else groups.set(item.category, [item])
  }
  return [...groups.keys()].sort().map((category) => ({ category, items: groups.get(category)! }))
}
