import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getColourCombo } from '@/lib/colour-combos'
import { comboDisplayName } from '@/lib/colour-names'
import { listOutfits } from '@/lib/wardrobe-db'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { ColourComboForm } from '@/components/colour-combos/colour-combo-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ColourComboPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { userId, wardrobeId } = await requireDefaultWardrobe()
  const [combo, outfits] = await Promise.all([
    getColourCombo(wardrobeId, userId, id),
    listOutfits(wardrobeId, userId),
  ])
  if (!combo) notFound()

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
        <h1 className="font-serif text-3xl font-medium text-foreground">
          {comboDisplayName(combo.name, combo.swatches.map((swatch) => swatch.hex))}
        </h1>
      </div>
      <ColourComboForm wardrobeId={wardrobeId} outfits={outfits} combo={combo} />
    </div>
  )
}
