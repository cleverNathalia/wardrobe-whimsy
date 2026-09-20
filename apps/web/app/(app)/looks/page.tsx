import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listLooks } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { LookCard } from '@/components/looks/look-card'
import { EmptyLooks } from '@/components/looks/empty-looks'
import { Button } from '@/components/ui/button'
import { DataUnavailable } from '@/components/ui/data-unavailable'
import { isDatabaseUnavailableError } from '@/lib/database-errors'

async function loadLooksPage() {
  try {
    const { userId, wardrobeId } = await requireDefaultWardrobe()
    return { kind: 'ready' as const, looks: await listLooks(wardrobeId, userId) }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    console.error('[looks/page] Database unavailable', error)
    return { kind: 'unavailable' as const }
  }
}

export default async function LooksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const data = await loadLooksPage()
  if (data.kind === 'unavailable') return <DataUnavailable resource="looks" />
  const { looks } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Your looks</h1>
          {looks.length > 0 && (
            <p className="text-muted-foreground text-sm mt-1">
              {looks.length} look{looks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {looks.length > 0 && (
          <Button asChild size="sm">
            <Link href="/looks/new">
              <Plus size={16} />
              Add look
            </Link>
          </Button>
        )}
      </div>

      {looks.length === 0 ? (
        <EmptyLooks />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {looks.map((look) => (
            <LookCard key={look.id} look={look} />
          ))}
        </div>
      )}
    </div>
  )
}
