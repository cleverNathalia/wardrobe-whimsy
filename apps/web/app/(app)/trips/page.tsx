import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listTrips } from '@/lib/trips'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { TripCard } from '@/components/trips/trip-card'
import { EmptyTrips } from '@/components/trips/empty-trips'
import { Button } from '@/components/ui/button'
import { DataUnavailable } from '@/components/ui/data-unavailable'
import { isDatabaseUnavailableError } from '@/lib/database-errors'
import type { Trip } from '@/lib/wardrobe-types'

async function loadTripsPage() {
  try {
    const { userId, wardrobeId } = await requireDefaultWardrobe()
    return { kind: 'ready' as const, trips: await listTrips(wardrobeId, userId) }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    console.error('[trips/page] Database unavailable', error)
    return { kind: 'unavailable' as const }
  }
}

const SECTIONS: Array<{ status: Trip['status']; title: string }> = [
  { status: 'now', title: 'Now' },
  { status: 'upcoming', title: 'Upcoming' },
  { status: 'past', title: 'Past' },
]

export default async function TripsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const data = await loadTripsPage()
  if (data.kind === 'unavailable') return <DataUnavailable resource="trips" />
  const { trips } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Trips</h1>
          {trips.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {trips.length} trip{trips.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {trips.length > 0 && (
          <Button asChild size="sm">
            <Link href="/trips/new">
              <Plus size={16} />
              New trip
            </Link>
          </Button>
        )}
      </div>

      {trips.length === 0 ? (
        <EmptyTrips />
      ) : (
        SECTIONS.map(({ status, title }) => {
          // Soonest first; past trips most recent first.
          const inSection = trips.filter((trip) => trip.status === status)
          if (status === 'past') inSection.reverse()
          if (inSection.length === 0) return null
          return (
            <section key={status} className="space-y-3">
              <h2 className="font-serif text-xl font-medium text-foreground">{title}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inSection.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
