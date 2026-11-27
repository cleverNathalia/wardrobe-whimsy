import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { formatTripDates } from '@/lib/trips/format'
import type { Trip } from '@/lib/wardrobe-types'

export function TripCard({ trip }: { trip: Trip }) {
  const dates = formatTripDates(trip.startDate, trip.endDate)
  const { itemCount, packedCount, outfitCount } = trip.packingList
  const overLimit = trip.packingList.groups.some((group) => group.overflowItemIds.length > 0)

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <p className="truncate font-serif text-lg font-medium text-foreground">{trip.name}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays size={14} />
        {dates ? `${dates} · ${trip.days} day${trip.days === 1 ? '' : 's'}` : 'No dates yet'}
      </p>
      <p className="mt-3 text-sm text-foreground">
        {outfitCount} outfit{outfitCount === 1 ? '' : 's'} · {itemCount} item{itemCount === 1 ? '' : 's'}
      </p>
      {itemCount > 0 && (
        <div className="mt-2 space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(packedCount / itemCount) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            Packed {packedCount} / {itemCount}
            {overLimit && <span className="text-destructive"> · over a limit</span>}
          </p>
        </div>
      )}
    </Link>
  )
}
