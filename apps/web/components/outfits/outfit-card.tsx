import { AppImage as Image } from '@/components/ui/app-image'
import Link from 'next/link'
import { Shirt } from 'lucide-react'
import type { OutfitWithItems } from '@/lib/wardrobe-types'

interface OutfitCardProps {
  outfit: OutfitWithItems
}

export function OutfitCard({ outfit }: OutfitCardProps) {
  const images = outfit.items.slice(0, 4).map((i) => i.clothingItem.imageUrl)

  return (
    <Link
      href={`/outfits/${outfit.id}`}
      className="group block rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Image collage */}
      <div className="aspect-square relative bg-muted overflow-hidden">
        {images.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Shirt size={32} className="text-muted-foreground/30" />
          </div>
        ) : images.length === 1 ? (
          <Image src={images[0]} alt={outfit.name} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" sizes="(max-width: 640px) 50vw, 33vw" />
        ) : (
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="relative overflow-hidden bg-muted">
                {images[idx] ? (
                  <Image src={images[idx]} alt="" fill className="object-cover" sizes="25vw" />
                ) : null}
              </div>
            ))}
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
