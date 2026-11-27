'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PACKING_GROUPS, PACKING_GROUP_LABELS, type PackingGroup } from '@wardrobe-whimsy/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OutfitLinkPicker } from '@/components/colour-combos/outfit-link-picker'
import { toDateInput } from '@/lib/trips/format'
import type { OutfitWithItems, Trip } from '@/lib/wardrobe-types'

interface TripFormProps {
  wardrobeId: string
  outfits: OutfitWithItems[]
  /** Editing an existing trip; omitted when creating one. */
  trip?: Trip
}

export function TripForm({ wardrobeId, outfits, trip }: TripFormProps) {
  const router = useRouter()
  const [name, setName] = useState(trip?.name ?? '')
  const [notes, setNotes] = useState(trip?.notes ?? '')
  const [startDate, setStartDate] = useState(toDateInput(trip?.startDate ?? null))
  const [endDate, setEndDate] = useState(toDateInput(trip?.endDate ?? null))
  // Kept as text so a cleared box means "no limit" rather than 0.
  const [limits, setLimits] = useState<Record<PackingGroup, string>>(() =>
    Object.fromEntries(PACKING_GROUPS.map((group) => [group, trip?.limits[group]?.toString() ?? ''])) as Record<
      PackingGroup,
      string
    >
  )
  const [outfitIds, setOutfitIds] = useState<string[]>(trip?.outfitIds ?? [])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const datesError =
    Boolean(startDate) !== Boolean(endDate)
      ? 'Set both dates, or neither.'
      : startDate && endDate && endDate < startDate
        ? 'The trip ends before it starts.'
        : null

  const save = async (event: { preventDefault(): void }) => {
    event.preventDefault()
    if (datesError) return
    setSaving(true)

    const body = {
      name,
      notes,
      startDate: startDate || null,
      endDate: endDate || null,
      limits: Object.fromEntries(
        PACKING_GROUPS.filter((group) => Number(limits[group]) >= 1).map((group) => [group, Number(limits[group])])
      ),
      outfitIds,
    }
    const res = trip
      ? await fetch(`/api/trips/${trip.id}?wardrobeId=${wardrobeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, wardrobeId }),
        })

    if (!res.ok) {
      toast.error('Could not save this trip. Please try again.')
      setSaving(false)
      return
    }

    const saved: { id: string } = await res.json()
    toast.success(trip ? 'Trip saved!' : 'Trip created!')
    router.push(`/trips/${saved.id}`)
    router.refresh()
  }

  const remove = async () => {
    if (!trip || !confirm('Delete this trip? Its outfits and items are kept.')) return
    setDeleting(true)
    const res = await fetch(`/api/trips/${trip.id}?wardrobeId=${wardrobeId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete trip.')
      setDeleting(false)
      return
    }
    toast.success('Trip deleted.')
    router.push('/trips')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-8">
      <section className="space-y-5">
        <h2 className="font-serif text-lg font-medium">Details</h2>
        <div className="space-y-1.5">
          <Label htmlFor="trip-name">Name</Label>
          <Input
            id="trip-name"
            value={name}
            required
            maxLength={60}
            placeholder="Italy 2026"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trip-start">First day</Label>
            <Input id="trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trip-end">Last day</Label>
            <Input
              id="trip-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {datesError ? (
          <p className="text-sm text-destructive">{datesError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Optional. With dates, the trip shows what you actually wore.</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="trip-notes">Notes</Label>
          <Textarea
            id="trip-notes"
            value={notes}
            maxLength={500}
            placeholder="Weather, plans, what not to forget…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-lg font-medium">Packing limits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Say you only want to pack 5 tops, and the list warns you when an outfit needs a sixth.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKING_GROUPS.map((group) => (
            <div key={group} className="space-y-1.5">
              <Label htmlFor={`limit-${group}`}>{PACKING_GROUP_LABELS[group]}</Label>
              <Input
                id={`limit-${group}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                placeholder="No limit"
                value={limits[group]}
                onChange={(e) => setLimits((current) => ({ ...current, [group]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </section>

      <section id="outfits" className="scroll-mt-6 space-y-3">
        <h2 className="font-serif text-lg font-medium">Outfits for this trip</h2>
        <OutfitLinkPicker outfits={outfits} selected={outfitIds} onChange={setOutfitIds} />
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving} disabled={saving || !name.trim() || Boolean(datesError)}>
          {trip ? 'Save changes' : 'Save trip'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {trip && (
          <Button type="button" variant="destructive" loading={deleting} onClick={remove} className="ml-auto">
            Delete trip
          </Button>
        )}
      </div>
    </form>
  )
}
