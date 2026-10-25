'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { comboDisplayName } from '@/lib/colour-names'
import type { ColourCombo, OutfitWithItems } from '@/lib/wardrobe-types'
import { OutfitLinkPicker } from './outfit-link-picker'
import { SwatchEditor, type DraftSwatch } from './swatch-editor'
import { SwatchStrip } from './swatch-strip'

interface ColourComboFormProps {
  wardrobeId: string
  outfits: OutfitWithItems[]
  /** Present when editing; absent when creating. */
  combo?: ColourCombo
}

export function ColourComboForm({ wardrobeId, outfits, combo }: ColourComboFormProps) {
  const router = useRouter()
  const [name, setName] = useState(combo?.name ?? '')
  const [notes, setNotes] = useState(combo?.notes ?? '')
  const [swatches, setSwatches] = useState<DraftSwatch[]>(
    () =>
      combo?.swatches.map((swatch) => ({
        key: swatch.id,
        hex: swatch.hex,
        label: swatch.label ?? '',
        source: swatch.source,
      })) ?? []
  )
  const [outfitIds, setOutfitIds] = useState<string[]>(combo?.outfitIds ?? [])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const hexes = swatches.map((swatch) => swatch.hex)

  const save = async (event: { preventDefault(): void }) => {
    event.preventDefault()
    if (swatches.length === 0) {
      toast.error('Add at least one colour first.')
      return
    }

    setSaving(true)
    const body = {
      name,
      notes,
      swatches: swatches.map(({ hex, label, source }) => ({ hex, label, source })),
      outfitIds,
    }
    const res = combo
      ? await fetch(`/api/colour-combos/${combo.id}?wardrobeId=${wardrobeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/colour-combos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, wardrobeId }),
        })

    if (!res.ok) {
      toast.error('Could not save this combo. Please try again.')
      setSaving(false)
      return
    }

    toast.success(combo ? 'Combo saved!' : 'Combo created!')
    router.push('/colour-combos')
    router.refresh()
  }

  const remove = async () => {
    if (!combo || !confirm('Delete this combo? Its outfits are kept.')) return
    setDeleting(true)
    const res = await fetch(`/api/colour-combos/${combo.id}?wardrobeId=${wardrobeId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete combo.')
      setDeleting(false)
      return
    }
    toast.success('Combo deleted.')
    router.push('/colour-combos')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-8">
      {/* What the gallery card will look like, as it is being built. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {hexes.length > 0 ? (
          <SwatchStrip hexes={hexes} className="h-24" />
        ) : (
          <div className="flex h-24 items-center justify-center bg-muted text-sm text-muted-foreground">
            Add colours below
          </div>
        )}
        <p className="p-3 text-sm font-medium text-foreground">{comboDisplayName(name, hexes)}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-medium">Colours</h2>
        <SwatchEditor value={swatches} onChange={setSwatches} />
      </section>

      <section className="space-y-5">
        <h2 className="font-serif text-lg font-medium">Details</h2>
        <div className="space-y-1.5">
          <Label htmlFor="combo-name">Name</Label>
          <Input
            id="combo-name"
            value={name}
            maxLength={60}
            placeholder={`Optional — otherwise "${comboDisplayName(null, hexes)}"`}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="combo-notes">Notes</Label>
          <Textarea
            id="combo-notes"
            value={notes}
            maxLength={500}
            placeholder="Where it works, what inspired it…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-medium">Outfits in this combo</h2>
        <OutfitLinkPicker outfits={outfits} selected={outfitIds} onChange={setOutfitIds} />
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving} disabled={saving || swatches.length === 0}>
          {combo ? 'Save changes' : 'Save combo'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {combo && (
          <Button type="button" variant="destructive" loading={deleting} onClick={remove} className="ml-auto">
            Delete combo
          </Button>
        )}
      </div>
    </form>
  )
}
