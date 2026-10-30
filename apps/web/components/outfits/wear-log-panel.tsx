'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, CalendarCheck, ImagePlus, Trash2 } from 'lucide-react'
import { AppImage as Image } from '@/components/ui/app-image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toDateInputValue } from '@/components/looks/look-date'
import { formatWearDay } from '@/lib/wear-day'
import type { OutfitWearHistory } from '@/lib/wears'

interface WearLogPanelProps {
  wardrobeId: string
  outfitId: string
  history: OutfitWearHistory
}

/**
 * "Wore it" plus this outfit's wear history. Looks linked to the outfit are
 * listed too, since they count as wears — but they are edited on the Looks
 * page, so only wear logs can be removed here.
 */
export function WearLogPanel({ wardrobeId, outfitId, history }: WearLogPanelProps) {
  const router = useRouter()
  // The user's local date, not the server's: "today" has to mean their today.
  const today = toDateInputValue(new Date())
  const [wornAt, setWornAt] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const logWear = async (event: { preventDefault(): void }) => {
    event.preventDefault()
    setSaving(true)

    const res = await fetch('/api/wear-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wardrobeId, outfitId, wornAt, notes: notes || undefined }),
    })

    setSaving(false)
    if (!res.ok) {
      toast.error('Could not log this wear. Please try again.')
      return
    }

    toast.success(`Logged as worn on ${formatWearDay(wornAt)}.`)
    setNotes('')
    router.refresh()
  }

  const removeWear = async (id: string) => {
    setRemovingId(id)
    const res = await fetch(`/api/wear-logs/${id}?wardrobeId=${wardrobeId}`, { method: 'DELETE' })
    setRemovingId(null)

    if (!res.ok) {
      toast.error('Could not remove that wear.')
      return
    }
    router.refresh()
  }

  const { timesWorn, entries } = history

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-medium text-foreground">Wear history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {timesWorn === 0 ? 'Not worn yet.' : `Worn ${timesWorn} ${timesWorn === 1 ? 'time' : 'times'}.`}
          </p>
        </div>
        {/* A look is a wear with a photo: starts the form with this outfit
            chosen, and comes back here after saving. */}
        <Button asChild variant="outline" size="sm">
          <Link href={`/looks/new?outfitId=${outfitId}`}>
            <ImagePlus size={16} />
            Add a look
          </Link>
        </Button>
      </div>

      <form onSubmit={logWear} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="wear-date">Worn on</Label>
          <Input
            id="wear-date"
            type="date"
            value={wornAt}
            max={today}
            required
            onChange={(e) => setWornAt(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="wear-notes">Notes</Label>
          <Input
            id="wear-notes"
            value={notes}
            maxLength={500}
            placeholder="Optional — where you wore it"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button type="submit" loading={saving} disabled={saving}>
          <CalendarCheck size={16} />
          Wore it
        </Button>
      </form>

      {entries.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {entries.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`} className="flex items-center gap-3 py-3">
              {entry.kind === 'look' ? (
                <Link
                  href={`/looks/${entry.id}`}
                  className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted"
                  aria-label={`Look from ${formatWearDay(entry.day)}`}
                >
                  <Image src={entry.imageUrl} alt="" fill className="object-cover" sizes="44px" />
                </Link>
              ) : (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted">
                  <CalendarCheck size={18} className="text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{formatWearDay(entry.day)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.kind === 'look' ? (
                    <span className="inline-flex items-center gap-1">
                      <Camera size={12} /> Look
                    </span>
                  ) : (
                    'Logged'
                  )}
                  {entry.notes ? ` · ${entry.notes}` : ''}
                </p>
              </div>

              {entry.kind === 'log' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  // 44px, the minimum touch target (NFR-4.1); the icon size is 40.
                  className="size-11"
                  loading={removingId === entry.id}
                  disabled={removingId !== null}
                  onClick={() => removeWear(entry.id)}
                  aria-label={`Remove the wear on ${formatWearDay(entry.day)}`}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
