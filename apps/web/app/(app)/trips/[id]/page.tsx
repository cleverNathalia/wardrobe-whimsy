import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, Pencil } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getTrip } from '@/lib/trips'
import { listClothingItems } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { formatTripDates, TRIP_STATUS_LABELS } from '@/lib/trips/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PackingList } from '@/components/trips/packing-list'
import { LooseItemAdder } from '@/components/trips/loose-item-adder'
import { TripOutfits } from '@/components/trips/trip-outfits'
import { TripRecap } from '@/components/trips/trip-recap'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TripPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const [trip, wardrobeItems] = await Promise.all([
    getTrip(wardrobeId, userId, id),
    listClothingItems(wardrobeId, userId),
  ])
  if (!trip) notFound()

  const dates = formatTripDates(trip.startDate, trip.endDate)
  const onList = new Set(trip.packingList.groups.flatMap((group) => group.items.map((item) => item.id)))
  const outfitNames = Object.fromEntries(trip.outfits.map((outfit) => [outfit.id, outfit.name]))
  // Changes whenever the saved ticks do, so the list drops its unsaved ones.
  const packedKey = trip.packingList.groups
    .flatMap((group) => group.items.filter((item) => item.packed).map((item) => item.id))
    .join(',')

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/trips"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to trips
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-3xl font-medium text-foreground">{trip.name}</h1>
              <Badge variant={trip.status === 'now' ? 'default' : 'muted'}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays size={14} />
              {dates
                ? `${dates} · ${trip.days} day${trip.days === 1 ? '' : 's'} · ${trip.outfits.length} outfit${trip.outfits.length === 1 ? '' : 's'} planned`
                : 'No dates yet'}
            </p>
            {trip.notes && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-foreground">{trip.notes}</p>}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/trips/${trip.id}/edit`}>
              <Pencil size={14} />
              Edit trip
            </Link>
          </Button>
        </div>
      </div>

      {trip.recap && <TripRecap recap={trip.recap} />}

      <TripOutfits trip={trip} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-medium text-foreground">Packing list</h2>
          <LooseItemAdder
            wardrobeId={wardrobeId}
            tripId={trip.id}
            items={wardrobeItems.filter((item) => !onList.has(item.id))}
          />
        </div>
        <PackingList
          key={packedKey}
          wardrobeId={wardrobeId}
          tripId={trip.id}
          list={trip.packingList}
          outfitNames={outfitNames}
        />
      </section>
    </div>
  )
}
