'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AppImage as Image } from '@/components/ui/app-image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ALL_CATEGORIES,
  CategoryFilter,
  categoriesFrom,
} from '@/components/wardrobe/category-filter'
import type { ClothingItem } from '@/lib/wardrobe-types'

interface ItemPickerGridProps {
  items: ClothingItem[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function ItemPickerGrid({ items, selectedIds, onChange }: ItemPickerGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES)

  const categories = useMemo(() => categoriesFrom(items), [items])

  const visible = activeCategory === ALL_CATEGORIES
    ? items
    : items.filter((i) => i.category === activeCategory)

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No items in your wardrobe yet.{' '}
        <Link href="/wardrobe/new" className="underline text-primary">Add some first.</Link>
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <CategoryFilter categories={categories} value={activeCategory} onChange={setActiveCategory} />

      {/* Item grid */}
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No items in this category.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {visible.map((item) => {
            const selected = selectedIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  'relative rounded-lg overflow-hidden border-2 transition-all text-left',
                  selected ? 'border-primary' : 'border-transparent',
                )}
              >
                <div className="aspect-square relative bg-muted">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="160px" />
                  {selected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-primary-foreground" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] font-medium text-foreground truncate px-1.5 py-1">{item.name}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
