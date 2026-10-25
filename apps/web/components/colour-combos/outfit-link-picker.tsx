'use client'

import { Check } from 'lucide-react'
import { CollagePreview } from '@/components/outfits/collage-preview'
import { cn } from '@/lib/utils'
import type { OutfitWithItems } from '@/lib/wardrobe-types'

interface OutfitLinkPickerProps {
  outfits: OutfitWithItems[]
  selected: string[]
  onChange: (outfitIds: string[]) => void
}

/** Toggle buttons over the outfits, showing each one's collage. */
export function OutfitLinkPicker({ outfits, selected, onChange }: OutfitLinkPickerProps) {
  if (outfits.length === 0) {
    return <p className="text-sm text-muted-foreground">No outfits yet — you can link them later.</p>
  }

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id])

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {outfits.map((outfit) => {
        const on = selected.includes(outfit.id)
        return (
          <button
            key={outfit.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(outfit.id)}
            className={cn(
              'relative overflow-hidden rounded-lg border-2 bg-card text-left transition-colors',
              on ? 'border-primary' : 'border-border hover:border-muted-foreground/40'
            )}
          >
            <div className="aspect-square bg-muted">
              <CollagePreview items={outfit.items} sizes="120px" />
            </div>
            <p className="truncate px-2 py-1.5 text-xs font-medium text-foreground">{outfit.name}</p>
            {on && (
              <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check size={14} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
