import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
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
    : await prisma.outfit.findFirst({
        where: { id, userId: user.id },
        include: {
          items: {
            include: { clothingItem: true },
            orderBy: { zIndex: 'asc' },
          },
        },
      })

  if (!outfit) notFound()

  const wardrobeItems = IS_DEMO_MODE
    ? DEMO_ITEMS
    : await prisma.clothingItem.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      })

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
