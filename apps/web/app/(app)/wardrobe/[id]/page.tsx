import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getClothingItem } from '@/lib/wardrobe-store'
import { IS_DEMO_MODE, DEMO_ITEMS } from '@/lib/demo'
import { EditItemForm } from '@/components/wardrobe/edit-item-form'
import { Badge } from '@/components/ui/badge'

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const item = IS_DEMO_MODE
    ? (DEMO_ITEMS.find((i) => i.id === id) ?? null)
    : await getClothingItem(user.id, id)
  if (!item) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/wardrobe"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to wardrobe
        </Link>
        <div className="flex items-start gap-3">
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground">{item.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground text-sm">{item.category}</span>
              {item.status === 'DRAFT' && <Badge variant="muted">Draft</Badge>}
            </div>
          </div>
        </div>
      </div>

      <EditItemForm item={item} googlePhotosEnabled={!!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} />
    </div>
  )
}
