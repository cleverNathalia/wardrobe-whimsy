'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Luggage, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Just what this panel needs, so the page doesn't send every trip's packing list to the browser. */
export interface OutfitTripOption {
  id: string
  name: string
  dates: string | null
  outfitIds: string[]
}

interface OutfitTripsProps {
  wardrobeId: string
  outfitId: string
  /** Every trip in the wardrobe; the ones this outfit is in are worked out here. */
  trips: OutfitTripOption[]
}

/**
 * The outfit's side of the trip link, so it can be added to a trip without
 * opening the trip first.
 */
export function OutfitTrips({ wardrobeId, outfitId, trips }: OutfitTripsProps) {
  const router = useRouter()
  const linkedIds = trips.filter((trip) => trip.outfitIds.includes(outfitId)).map((trip) => trip.id)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(linkedIds)
  const [saving, setSaving] = useState(false)

  const linked = trips.filter((trip) => linkedIds.includes(trip.id))

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/outfits/${outfitId}/trips?wardrobeId=${wardrobeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripIds: selected }),
    })
    setSaving(false)

    if (!res.ok) {
      toast.error('Could not update trips.')
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
        <h2 className="font-serif text-xl font-medium text-foreground">Trips</h2>
        {trips.length > 0 && !editing && (
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

      {trips.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trips yet.{' '}
          <Link href="/trips/new" className="font-medium text-foreground underline underline-offset-4">
            Plan one
          </Link>{' '}
          to work out what to pack.
        </p>
      ) : editing ? (
        <>
          <div className="flex flex-wrap gap-2">
            {trips.map((trip) => {
              const on = selected.includes(trip.id)
              return (
                <button
                  key={trip.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(trip.id)}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-full border-2 px-3 py-1 text-sm transition-colors',
                    on ? 'border-primary' : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <Luggage size={14} className="text-muted-foreground" />
                  {trip.name}
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
        <p className="text-sm text-muted-foreground">Not in any trip yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {linked.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="flex min-h-11 items-center gap-2 rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
            >
              <Luggage size={14} className="text-muted-foreground" />
              {trip.name}
              {trip.dates && <span className="text-xs text-muted-foreground">{trip.dates}</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
