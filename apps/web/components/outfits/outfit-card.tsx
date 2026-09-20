import Link from 'next/link'
import { Shirt } from 'lucide-react'
import { CollagePreview } from './collage-preview'
import type { OutfitWithItems } from '@/lib/wardrobe-types'

interface OutfitCardProps {
  outfit: OutfitWithItems
}

export function OutfitCard({ outfit }: OutfitCardProps) {
  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="group block rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/*
        The card shows the saved arrangement itself rather than a grid of
        thumbnails, so the gallery and the collage editor always agree. The
        stage is portrait, so it is letterboxed inside the square card.
      */}
      <div className="aspect-square relative bg-muted overflow-hidden">
        {outfit.items.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Shirt size={32} className="text-muted-foreground/30" />
          </div>
        ) : (
          <div className="h-full transition-transform duration-300 group-hover:scale-[1.03]">
            <CollagePreview items={outfit.items} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm text-foreground truncate">{outfit.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {outfit.items.length} {outfit.items.length === 1 ? 'item' : 'items'}
          {outfit.occasion ? ` · ${outfit.occasion}` : ''}
        </p>
      </div>
    </Link>
  )
}
