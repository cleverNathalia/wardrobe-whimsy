import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getOutfit } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { CollageCanvas } from '@/components/outfits/collage-canvas'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OutfitCollagePage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const outfit = await getOutfit(wardrobeId, userId, id)
  if (!outfit) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/outfits/${outfit.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          Back to {outfit.name}
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground mt-2">Arrange collage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Position, scale, rotate and layer this outfit&rsquo;s items.
        </p>
      </div>

      <CollageCanvas wardrobeId={wardrobeId} outfit={outfit} />
    </div>
  )
}
