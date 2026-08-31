'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClothingItem } from '@/lib/wardrobe-types'

interface ItemPickerGridProps {
  items: ClothingItem[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function ItemPickerGrid({ items, selectedIds, onChange }: ItemPickerGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All')

  const categories = useMemo(() => {
    const seen = new Set<string>()
    items.forEach((i) => seen.add(i.category))
    return ['All', ...Array.from(seen).sort()]
  }, [items])

  const visible = activeCategory === 'All'
    ? items
    : items.filter((i) => i.category === activeCategory)

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No items in your wardrobe yet.{' '}
        <a href="/wardrobe/new" className="underline text-primary">Add some first.</a>
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

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
