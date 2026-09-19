import { AppImage as Image } from '@/components/ui/app-image'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import type { LookWithOutfit } from '@/lib/wardrobe-types'
import { formatWornAt } from './look-date'

interface LookCardProps {
  look: LookWithOutfit
}

export function LookCard({ look }: LookCardProps) {
  return (
    <Link
      href={`/looks/${look.id}`}
      className="group block rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Photos of a person are taller than they are wide, unlike item shots. */}
      <div className="aspect-[3/4] relative bg-muted overflow-hidden">
        <Image
          src={look.imageUrl}
          alt={look.outfit ? `Wearing ${look.outfit.name}` : 'A look'}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      </div>

      <div className="p-3">
        <p className="font-medium text-sm text-foreground truncate">{formatWornAt(look.wornAt)}</p>
        {look.outfit ? (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
            <Layers size={12} className="shrink-0" />
            <span className="truncate">{look.outfit.name}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">No outfit linked</p>
        )}
      </div>
    </Link>
  )
}
