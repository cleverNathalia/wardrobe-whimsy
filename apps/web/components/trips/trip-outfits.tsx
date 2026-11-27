import Link from 'next/link'
import { Check, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollagePreview } from '@/components/outfits/collage-preview'
import type { TripDetail } from '@/lib/wardrobe-types'

/** The trip's outfits, each marked worn or not once the trip has started. */
export function TripOutfits({ trip }: { trip: TripDetail }) {
  const showWorn = trip.status !== 'upcoming'
  const worn = new Set(trip.wornOutfitIds)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl font-medium text-foreground">
          Outfits <span className="text-base text-muted-foreground">({trip.outfits.length})</span>
        </h2>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/trips/${trip.id}/edit#outfits`}>
              <Pencil size={14} />
              Choose outfits
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/outfits/new?tripId=${trip.id}`}>
              <Plus size={16} />
              New outfit
            </Link>
          </Button>
        </div>
      </div>

      {trip.outfits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No outfits yet. Choose some you&apos;ve already made, or make a new one for this trip.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {trip.outfits.map((outfit) => (
            <Link
              key={outfit.id}
              href={`/outfits/${outfit.id}`}
              className="relative overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="aspect-square bg-muted">
                <CollagePreview items={outfit.items} sizes="120px" />
              </div>
              <p className="truncate px-2 pt-1.5 text-xs font-medium text-foreground">{outfit.name}</p>
              {showWorn && (
                <p className="px-2 pb-1.5 text-xs text-muted-foreground">
                  {worn.has(outfit.id) ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Check size={12} />
                      Worn
                    </span>
                  ) : (
                    'Not worn yet'
                  )}
                </p>
              )}
              {!showWorn && <div className="pb-1.5" />}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
