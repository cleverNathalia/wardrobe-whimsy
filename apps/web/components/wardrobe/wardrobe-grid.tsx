'use client'

import { useMemo, useState } from 'react'
import type { ClothingItem } from '@/lib/wardrobe-types'
import { ClothingItemCard } from './clothing-item-card'
import { ALL_CATEGORIES, CategoryFilter, categoriesFrom } from './category-filter'
import { Skeleton } from '@/components/ui/skeleton'

interface WardrobeGridProps {
  items: ClothingItem[]
}

export function WardrobeGrid({ items }: WardrobeGridProps) {
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)

  const categories = useMemo(() => categoriesFrom(items), [items])

  // Filtered in the browser rather than round-tripping: the page already has
  // every item, so switching categories is instant.
  const visible = useMemo(
    () => (category === ALL_CATEGORIES ? items : items.filter((item) => item.category === category)),
    [items, category]
  )

  return (
    <div className="space-y-4">
      <CategoryFilter categories={categories} value={category} onChange={setCategory} />

      {category !== ALL_CATEGORIES && (
        <p className="text-muted-foreground text-sm">
          Showing {visible.length} of {items.length} item{items.length === 1 ? '' : 's'}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">No items in this category.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((item) => (
            <ClothingItemCard key={item.id} item={item} />
          ))}
        </div>
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
