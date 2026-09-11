import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCurrentUser, ensureDbUser } from '@/lib/auth'
import { listClothingItems, getOrCreateDefaultWardrobe } from '@/lib/wardrobe-db'
import { isGoogleConnected } from '@/lib/google-oauth'
import { redirect } from 'next/navigation'
import { WardrobeGrid } from '@/components/wardrobe/wardrobe-grid'
import { EmptyWardrobe } from '@/components/wardrobe/empty-wardrobe'
import { ConnectGoogleDrive } from '@/components/wardrobe/connect-google-drive'
import { Button } from '@/components/ui/button'
import { DataUnavailable } from '@/components/ui/data-unavailable'
import { isDatabaseUnavailableError } from '@/lib/database-errors'

type WardrobePageProps = { searchParams: Promise<{ google?: string }> }

async function loadWardrobePage(userId: string, searchParams: WardrobePageProps['searchParams']) {
  try {
    // The users row is what wardrobes hang off by foreign key, so it has to
    // exist before getOrCreateDefaultWardrobe writes.
    await ensureDbUser()
    const wardrobe = await getOrCreateDefaultWardrobe(userId)

    if (!wardrobe.googleFolderId) {
      const { google: googleStatus } = await searchParams
      return {
        kind: 'connect' as const,
        wardrobeId: wardrobe.id,
        isGoogleConnected: await isGoogleConnected(userId),
        googleStatus,
      }
    }

    return {
      kind: 'items' as const,
      items: await listClothingItems(wardrobe.id, userId),
    }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    console.error('[wardrobe/page] Database unavailable', error)
    return { kind: 'unavailable' as const }
  }
}

export default async function WardrobePage({ searchParams }: WardrobePageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const data = await loadWardrobePage(user.id, searchParams)
  if (data.kind === 'unavailable') return <DataUnavailable resource="wardrobe" />
  if (data.kind === 'connect') {
    return (
      <ConnectGoogleDrive
        wardrobeId={data.wardrobeId}
        isGoogleConnected={data.isGoogleConnected}
        googleStatus={data.googleStatus}
      />
    )
  }

  const { items } = data
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Your wardrobe</h1>
          {items.length > 0 && (
            <p className="text-muted-foreground text-sm mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {items.length > 0 && (
          <Button asChild size="sm">
            <Link href="/wardrobe/new">
              <Plus size={16} />
              Add item
            </Link>
          </Button>
        )}
      </div>

      {items.length === 0 ? <EmptyWardrobe /> : <WardrobeGrid items={items} />}
    </div>
  )
}
