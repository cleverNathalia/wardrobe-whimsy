import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { IS_DEMO_MODE, DEMO_ITEMS } from '@/lib/demo'
import { OutfitForm } from '@/components/outfits/outfit-form'

export default async function NewOutfitPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const wardrobeItems = IS_DEMO_MODE
    ? DEMO_ITEMS
    : await prisma.clothingItem.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">New outfit</h1>
        <p className="text-muted-foreground text-sm mt-1">Name it, pick the items, and save.</p>
      </div>
      <OutfitForm wardrobeItems={wardrobeItems} />
    </div>
  )
}
