import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getLook, listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { EditLookForm } from '@/components/looks/edit-look-form'
import { formatWornAt } from '@/components/looks/look-date'

const HAS_GOOGLE_PHOTOS = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface Props {
  params: Promise<{ id: string }>
}

async function loadLookPage(id: string) {
  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const [look, outfits] = await Promise.all([
    getLook(wardrobeId, userId, id),
    listOutfits(wardrobeId, userId),
  ])

  return { wardrobeId, look, outfits }
}

export default async function LookDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { wardrobeId, look, outfits } = await loadLookPage(id)
  if (!look) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">{formatWornAt(look.wornAt)}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {look.outfit ? `Wearing ${look.outfit.name}.` : 'Not linked to an outfit.'} Edit the details or
          replace the photo.
        </p>
      </div>
      <EditLookForm
        wardrobeId={wardrobeId}
        look={look}
        outfits={outfits}
        googlePhotosEnabled={HAS_GOOGLE_PHOTOS}
      />
    </div>
  )
}
