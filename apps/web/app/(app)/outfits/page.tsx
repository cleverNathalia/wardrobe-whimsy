import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { OutfitCard } from '@/components/outfits/outfit-card'
import { EmptyOutfits } from '@/components/outfits/empty-outfits'
import { Button } from '@/components/ui/button'
import { DataUnavailable } from '@/components/ui/data-unavailable'
import { isDatabaseUnavailableError } from '@/lib/database-errors'

async function loadOutfitsPage() {
  try {
    const { userId, wardrobeId } = await requireDefaultWardrobe()
    return { kind: 'ready' as const, outfits: await listOutfits(wardrobeId, userId) }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    console.error('[outfits/page] Database unavailable', error)
    return { kind: 'unavailable' as const }
  }
}

export default async function OutfitsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const data = await loadOutfitsPage()
  if (data.kind === 'unavailable') return <DataUnavailable resource="outfits" />
  const { outfits } = data

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
