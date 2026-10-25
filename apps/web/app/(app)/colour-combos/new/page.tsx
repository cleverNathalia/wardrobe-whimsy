import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { ColourComboForm } from '@/components/colour-combos/colour-combo-form'

export default async function NewColourComboPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const outfits = await listOutfits(wardrobeId, userId)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/colour-combos"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to colour combos
        </Link>
        <h1 className="font-serif text-3xl font-medium text-foreground">New colour combo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick the colours, then link any outfits that wear them.</p>
      </div>
      <ColourComboForm wardrobeId={wardrobeId} outfits={outfits} />
    </div>
  )
}
