import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { IS_DEMO_MODE, DEMO_OUTFITS } from '@/lib/demo'
import { OutfitCard } from '@/components/outfits/outfit-card'
import { EmptyOutfits } from '@/components/outfits/empty-outfits'
import { Button } from '@/components/ui/button'

export default async function OutfitsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const outfits = IS_DEMO_MODE
    ? DEMO_OUTFITS
    : await prisma.outfit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { clothingItem: true },
            orderBy: { zIndex: 'asc' },
          },
        },
      })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Your outfits</h1>
          {outfits.length > 0 && (
            <p className="text-muted-foreground text-sm mt-1">
              {outfits.length} outfit{outfits.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {outfits.length > 0 && (
          <Button asChild size="sm">
            <Link href="/outfits/new">
              <Plus size={16} />
              New outfit
            </Link>
          </Button>
        )}
      </div>

      {outfits.length === 0 ? (
        <EmptyOutfits />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </div>
  )
}
