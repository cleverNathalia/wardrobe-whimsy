'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SwatchStrip } from '@/components/colour-combos/swatch-strip'
import { comboDisplayName } from '@/lib/colour-names'
import { cn } from '@/lib/utils'
import type { ColourCombo } from '@/lib/wardrobe-types'

interface OutfitColourCombosProps {
  wardrobeId: string
  outfitId: string
  /** Every combo in the wardrobe; the ones linked to this outfit are worked out here. */
  combos: ColourCombo[]
}

/**
 * The outfit's side of the combo link, so it can be edited from either end
 * without opening each combo in turn.
 */
export function OutfitColourCombos({ wardrobeId, outfitId, combos }: OutfitColourCombosProps) {
  const router = useRouter()
  const linkedIds = combos.filter((combo) => combo.outfitIds.includes(outfitId)).map((combo) => combo.id)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(linkedIds)
  const [saving, setSaving] = useState(false)

  const hexesOf = (combo: ColourCombo) => combo.swatches.map((swatch) => swatch.hex)
  const linked = combos.filter((combo) => linkedIds.includes(combo.id))

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/outfits/${outfitId}/colour-combos?wardrobeId=${wardrobeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comboIds: selected }),
    })
    setSaving(false)

    if (!res.ok) {
      toast.error('Could not update colour combos.')
      return
    }
    setEditing(false)
    router.refresh()
  }

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]))

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-medium text-foreground">Colour combos</h2>
        {combos.length > 0 && !editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelected(linkedIds)
              setEditing(true)
            }}
          >
            <Pencil size={14} />
            Change
          </Button>
        )}
      </div>

      {combos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No colour combos yet.{' '}
          <Link href="/colour-combos/new" className="font-medium text-foreground underline underline-offset-4">
            Make one
          </Link>{' '}
          to group outfits by palette.
        </p>
      ) : editing ? (
        <>
          <div className="flex flex-wrap gap-2">
            {combos.map((combo) => {
              const on = selected.includes(combo.id)
              return (
                <button
                  key={combo.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(combo.id)}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm transition-colors',
                    on ? 'border-primary' : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <SwatchStrip hexes={hexesOf(combo)} className="h-7 w-12 rounded-full" />
                  {comboDisplayName(combo.name, hexesOf(combo))}
                  {on && <Check size={14} className="text-primary" />}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save} loading={saving} disabled={saving}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </>
      ) : linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not in any combo yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {linked.map((combo) => (
            <Link
              key={combo.id}
              href={`/colour-combos/${combo.id}`}
              className="flex min-h-11 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm hover:bg-accent"
            >
              <SwatchStrip hexes={hexesOf(combo)} className="h-7 w-12 rounded-full" />
              {comboDisplayName(combo.name, hexesOf(combo))}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
