import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listClothingItems } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { OutfitForm } from '@/components/outfits/outfit-form'

async function loadNewOutfitPage() {
  const { userId, wardrobeId } = await requireDefaultWardrobe()
  return { wardrobeId, wardrobeItems: await listClothingItems(wardrobeId, userId) }
}

export default async function NewOutfitPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { wardrobeId, wardrobeItems } = await loadNewOutfitPage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">New outfit</h1>
        <p className="text-muted-foreground text-sm mt-1">Name it, pick the items, and save.</p>
      </div>
      <OutfitForm wardrobeId={wardrobeId} wardrobeItems={wardrobeItems} />
    </div>
  )
}
