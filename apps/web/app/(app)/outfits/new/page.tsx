import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listClothingItems, suggestOutfitName } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { getTripSummary } from '@/lib/trips'
import { OutfitForm } from '@/components/outfits/outfit-form'

async function loadNewOutfitPage(tripId: string | undefined) {
  const { userId, wardrobeId } = await requireDefaultWardrobe()

  const [wardrobeItems, defaultName, trip] = await Promise.all([
    listClothingItems(wardrobeId, userId),
    suggestOutfitName(wardrobeId, userId),
    // Only one of this wardrobe's trips is honoured; anything else is ignored.
    tripId ? getTripSummary(wardrobeId, userId, tripId) : null,
  ])

  return { wardrobeId, wardrobeItems, defaultName, trip }
}

type NewOutfitPageProps = { searchParams: Promise<{ tripId?: string }> }

export default async function NewOutfitPage({ searchParams }: NewOutfitPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  // Set by "New outfit" on a trip's page.
  const { tripId } = await searchParams
  const { wardrobeId, wardrobeItems, defaultName, trip } = await loadNewOutfitPage(tripId)

  return (
    <div className="space-y-6">
      <div>
        {trip && (
          <Link
            href={`/trips/${trip.id}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back to {trip.name}
          </Link>
        )}
        <h1 className="font-serif text-3xl font-medium text-foreground">New outfit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {trip ? `Name it, pick the items, and save — it's added to ${trip.name}.` : 'Name it, pick the items, and save.'}
        </p>
      </div>
      {/* Worked out on the server: the suggestion needs a database read, and
          a value computed while rendering a client component would differ
          between the server and browser renders and break hydration. */}
      <OutfitForm
        wardrobeId={wardrobeId}
        wardrobeItems={wardrobeItems}
        defaultName={defaultName}
        tripId={trip?.id}
      />
    </div>
  )
}
