import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { suggestOutfitName } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { OutfitSuggestions } from '@/components/outfits/outfit-suggestions'

export default async function SuggestOutfitPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const defaultName = await suggestOutfitName(wardrobeId, userId)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/outfits"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to outfits
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">Suggest an outfit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an occasion and season, and get outfits built from your wardrobe — favouring things you
          haven&apos;t worn lately.
        </p>
      </div>
      <OutfitSuggestions wardrobeId={wardrobeId} defaultName={defaultName} />
    </div>
  )
}
