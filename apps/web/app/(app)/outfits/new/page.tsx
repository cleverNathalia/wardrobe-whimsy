import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listClothingItems, suggestOutfitName } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { OutfitForm } from '@/components/outfits/outfit-form'

async function loadNewOutfitPage() {
  const { userId, wardrobeId } = await requireDefaultWardrobe()

  const [wardrobeItems, defaultName] = await Promise.all([
    listClothingItems(wardrobeId, userId),
    suggestOutfitName(wardrobeId, userId),
  ])

  return { wardrobeId, wardrobeItems, defaultName }
}

export default async function NewOutfitPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { wardrobeId, wardrobeItems, defaultName } = await loadNewOutfitPage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">New outfit</h1>
        <p className="text-muted-foreground text-sm mt-1">Name it, pick the items, and save.</p>
      </div>
      {/* Worked out on the server: the suggestion needs a database read, and
          a value computed while rendering a client component would differ
          between the server and browser renders and break hydration. */}
      <OutfitForm
        wardrobeId={wardrobeId}
        wardrobeItems={wardrobeItems}
        defaultName={defaultName}
      />
    </div>
  )
}
