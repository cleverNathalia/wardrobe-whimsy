import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { suggestItemName } from '@/lib/wardrobe-db'
import { AddItemForm } from '@/components/wardrobe/add-item-form'

const HAS_GOOGLE_PHOTOS = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export default async function NewItemPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const defaultName = await suggestItemName(wardrobeId, userId)

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
        <h1 className="font-serif text-3xl font-medium text-foreground">Add an item</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a photo and fill in the details.</p>
      </div>

      {/* Worked out on the server: the suggestion needs a database read, and
          a value computed while rendering a client component would differ
          between the server and browser renders and break hydration. */}
      <AddItemForm
        wardrobeId={wardrobeId}
        googlePhotosEnabled={HAS_GOOGLE_PHOTOS}
        defaultName={defaultName}
      />
    </div>
  )
}
