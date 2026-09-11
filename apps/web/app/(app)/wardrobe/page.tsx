import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listClothingItems, getOrCreateDefaultWardrobe } from '@/lib/wardrobe-db'
import { redirect } from 'next/navigation'
import { IS_DEMO_MODE, DEMO_ITEMS } from '@/lib/demo'
import { WardrobeGrid } from '@/components/wardrobe/wardrobe-grid'
import { EmptyWardrobe } from '@/components/wardrobe/empty-wardrobe'
import { ConnectFolderLink } from '@/components/wardrobe/connect-folder-link'
import { Button } from '@/components/ui/button'

export default async function WardrobePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  if (IS_DEMO_MODE) {
    const items = DEMO_ITEMS
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

  const wardrobe = await getOrCreateDefaultWardrobe(user.id)

  if (!wardrobe.googleFolderId) {
    return <ConnectFolderLink wardrobeId={wardrobe.id} />
  }

  const items = await listClothingItems(wardrobe.id, user.id)

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
