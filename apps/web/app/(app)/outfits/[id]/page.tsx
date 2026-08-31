import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getOutfit, listClothingItems } from '@/lib/wardrobe-store'
import { IS_DEMO_MODE, DEMO_ITEMS, DEMO_OUTFITS } from '@/lib/demo'
import { EditOutfitForm } from '@/components/outfits/edit-outfit-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OutfitDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const outfit = IS_DEMO_MODE
    ? DEMO_OUTFITS.find((o) => o.id === id) ?? null
    : await getOutfit(user.id, id)

  if (!outfit) notFound()

  const wardrobeItems = IS_DEMO_MODE ? DEMO_ITEMS : await listClothingItems(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">{outfit.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit details or swap items.</p>
      </div>
      <EditOutfitForm outfit={outfit} wardrobeItems={wardrobeItems} />
    </div>
  )
}
