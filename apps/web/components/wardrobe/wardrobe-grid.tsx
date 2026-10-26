'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { Rows3 } from 'lucide-react'
import type { ClothingItem } from '@/lib/wardrobe-types'
import { cn } from '@/lib/utils'
import { groupByCategory } from '@/lib/group-by-category'
import { ClothingItemCard } from './clothing-item-card'
import { ALL_CATEGORIES, CategoryFilter, categoriesFrom } from './category-filter'
import { Skeleton } from '@/components/ui/skeleton'

interface WardrobeGridProps {
  /** Newest first — the order they were uploaded in, as the page loads them. */
  items: ClothingItem[]
}

/**
 * Remembered per browser, so the wardrobe opens the way it was left. Kept in
 * memory too, so the toggle still works where storage is blocked.
 */
const GROUP_KEY = 'wardrobe:group-by-category'
let groupedInMemory = false
const groupedListeners = new Set<() => void>()

function readGrouped(): boolean {
  try {
    const stored = window.localStorage.getItem(GROUP_KEY)
    return stored === null ? groupedInMemory : stored === 'true'
  } catch {
    return groupedInMemory
  }
}

function writeGrouped(value: boolean) {
  groupedInMemory = value
  try {
    window.localStorage.setItem(GROUP_KEY, String(value))
  } catch {
    // Not remembered for next time; the toggle still works for this visit.
  }
  groupedListeners.forEach((listener) => listener())
}

function subscribeGrouped(listener: () => void) {
  groupedListeners.add(listener)
  return () => {
    groupedListeners.delete(listener)
  }
}

/** An id is a single token, and categories like "Hair Accessories" have spaces. */
const headingId = (category: string) => `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

function ItemGrid({ items }: { items: ClothingItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ClothingItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}

export function WardrobeGrid({ items }: WardrobeGridProps) {
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)
  // The server render cannot see browser storage, so it always starts in
  // upload order; React swaps in the remembered choice once it hydrates.
  const grouped = useSyncExternalStore(subscribeGrouped, readGrouped, () => false)
  const toggleGrouped = () => writeGrouped(!grouped)

  const categories = useMemo(() => categoriesFrom(items), [items])

  // Filtered in the browser rather than round-tripping: the page already has
  // every item, so switching categories is instant.
  const visible = useMemo(
    () => (category === ALL_CATEGORIES ? items : items.filter((item) => item.category === category)),
    [items, category]
  )

  const sections = useMemo(() => groupByCategory(visible), [visible])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CategoryFilter categories={categories} value={category} onChange={setCategory} />
        <button
          type="button"
          onClick={toggleGrouped}
          aria-pressed={grouped}
          className={cn(
            'ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            grouped ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <Rows3 size={14} />
          Group by category
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        {category !== ALL_CATEGORIES && `Showing ${visible.length} of ${items.length} item${items.length === 1 ? '' : 's'} · `}
        {grouped ? 'Grouped by category' : 'Newest first'}
      </p>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No items in this category.</p>
      ) : grouped ? (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.category} aria-labelledby={headingId(section.category)} className="space-y-3">
              <h2
                id={headingId(section.category)}
                className="font-serif text-xl font-medium text-foreground"
              >
                {section.category}{' '}
                <span className="font-sans text-sm font-normal text-muted-foreground">({section.items.length})</span>
              </h2>
              <ItemGrid items={section.items} />
            </section>
          ))}
        </div>
      ) : (
        <ItemGrid items={visible} />
      )}
    </div>
  )
}

export function WardrobeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border">
          <Skeleton className="aspect-square" />
          <div className="p-3 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
