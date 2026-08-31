import type { ClothingItem } from '@/lib/wardrobe-types'
import { ClothingItemCard } from './clothing-item-card'
import { Skeleton } from '@/components/ui/skeleton'

interface WardrobeGridProps {
  items: ClothingItem[]
}

export function WardrobeGrid({ items }: WardrobeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <ClothingItemCard key={item.id} item={item} />
      ))}
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
