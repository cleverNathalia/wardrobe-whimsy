import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { TripForm } from '@/components/trips/trip-form'

export default async function NewTripPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const outfits = await listOutfits(wardrobeId, userId)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/trips"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to trips
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">New trip</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name it, add dates if you know them, and pick the outfits you&apos;re taking.
        </p>
      </div>
      <TripForm wardrobeId={wardrobeId} outfits={outfits} />
    </div>
  )
}
