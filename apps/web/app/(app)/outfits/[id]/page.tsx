import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getOutfit, listClothingItems } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { IS_DEMO_MODE, DEMO_ITEMS, DEMO_OUTFITS } from '@/lib/demo'
import { EditOutfitForm } from '@/components/outfits/edit-outfit-form'

interface Props {
  params: Promise<{ id: string }>
}

async function loadOutfitPage(id: string) {
  if (IS_DEMO_MODE) {
    return {
      wardrobeId: 'demo',
      outfit: DEMO_OUTFITS.find((o) => o.id === id) ?? null,
      wardrobeItems: DEMO_ITEMS,
    }
  }

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
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">{outfit.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit details or swap items.</p>
      </div>
      <EditOutfitForm wardrobeId={wardrobeId} outfit={outfit} wardrobeItems={wardrobeItems} />
    </div>
  )
}
