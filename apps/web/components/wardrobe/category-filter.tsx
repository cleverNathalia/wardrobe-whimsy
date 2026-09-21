'use client'

import { cn } from '@/lib/utils'

/** The pseudo-category meaning "don't filter". Not a real category name. */
export const ALL_CATEGORIES = 'All'

/**
 * The categories actually present, so the filter never offers one that would
 * return nothing. Sorted, with "All" pinned first.
 */
export function categoriesFrom(items: { category: string }[]): string[] {
  const present = Array.from(new Set(items.map((item) => item.category))).sort()
  return [ALL_CATEGORIES, ...present]
}

interface CategoryFilterProps {
  categories: string[]
  value: string
  onChange: (category: string) => void
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  // "All" plus a single category is not a choice — every item matches either
  // way, so the row would be noise.
  if (categories.length <= 2) return null

  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by category">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          aria-pressed={value === category}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            value === category
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
