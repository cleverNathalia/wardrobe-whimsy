import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { LookForm } from '@/components/looks/look-form'

const HAS_GOOGLE_PHOTOS = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

async function loadNewLookPage() {
  const { userId, wardrobeId } = await requireDefaultWardrobe()
  return { wardrobeId, outfits: await listOutfits(wardrobeId, userId) }
}

export default async function NewLookPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { wardrobeId, outfits } = await loadNewLookPage()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/looks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to looks
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">Add a look</h1>
        <p className="text-muted-foreground text-sm mt-1">
          A photo of you wearing it, and when. Linking an outfit is optional.
        </p>
      </div>

      <LookForm wardrobeId={wardrobeId} outfits={outfits} googlePhotosEnabled={HAS_GOOGLE_PHOTOS} />
    </div>
  )
}
