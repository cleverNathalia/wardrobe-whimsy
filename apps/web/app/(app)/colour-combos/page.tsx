import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { listColourCombos } from '@/lib/colour-combos'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { ColourComboCard } from '@/components/colour-combos/colour-combo-card'
import { EmptyColourCombos } from '@/components/colour-combos/empty-colour-combos'
import { Button } from '@/components/ui/button'
import { DataUnavailable } from '@/components/ui/data-unavailable'
import { isDatabaseUnavailableError } from '@/lib/database-errors'

async function loadColourCombosPage() {
  try {
    const { userId, wardrobeId } = await requireDefaultWardrobe()
    return { kind: 'ready' as const, combos: await listColourCombos(wardrobeId, userId) }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    console.error('[colour-combos/page] Database unavailable', error)
    return { kind: 'unavailable' as const }
  }
}

export default async function ColourCombosPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const data = await loadColourCombosPage()
  if (data.kind === 'unavailable') return <DataUnavailable resource="colour combos" />
  const { combos } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-foreground">Colour combos</h1>
          {combos.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {combos.length} combo{combos.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {combos.length > 0 && (
          <Button asChild size="sm">
            <Link href="/colour-combos/new">
              <Plus size={16} />
              New combo
            </Link>
          </Button>
        )}
      </div>

      {combos.length === 0 ? (
        <EmptyColourCombos />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {combos.map((combo) => (
            <ColourComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      )}
    </div>
  )
}
