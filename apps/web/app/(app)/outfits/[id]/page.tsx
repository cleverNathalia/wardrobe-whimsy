import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getOutfit, listClothingItems } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { EditOutfitForm } from '@/components/outfits/edit-outfit-form'

interface Props {
  params: Promise<{ id: string }>
}

async function loadOutfitPage(id: string) {
  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const [outfit, wardrobeItems] = await Promise.all([
    getOutfit(wardrobeId, userId, id),
    listClothingItems(wardrobeId, userId),
  ])

  return { wardrobeId, outfit, wardrobeItems }
}

export default async function OutfitDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { wardrobeId, outfit, wardrobeItems } = await loadOutfitPage(id)
  if (!outfit) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">{outfit.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Edit details or swap items.</p>
        </div>
        <Link
          href={`/outfits/${outfit.id}/collage`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <LayoutGrid size={16} />
          Arrange collage
        </Link>
      </div>
      <EditOutfitForm wardrobeId={wardrobeId} outfit={outfit} wardrobeItems={wardrobeItems} />
    </div>
  )
}
