import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getTrip } from '@/lib/trips'
import { listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { TripForm } from '@/components/trips/trip-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTripPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const [trip, outfits] = await Promise.all([getTrip(wardrobeId, userId, id), listOutfits(wardrobeId, userId)])
  if (!trip) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/trips/${trip.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to {trip.name}
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">Edit trip</h1>
      </div>
      <TripForm wardrobeId={wardrobeId} outfits={outfits} trip={trip} />
    </div>
  )
}
