'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Sparkles } from 'lucide-react'
import { AppImage as Image } from '@/components/ui/app-image'
import { Button } from '@/components/ui/button'
import { saveOutfitPictureQuietly } from '@/lib/outfit-picture'
import type { SuggestionResult } from '@/lib/suggestions/get-suggestions'

interface TripSuggestionsProps {
  wardrobeId: string
  tripId: string
  /** Pre-filled name for a saved suggestion. The page works it out, so it moves on after each save. */
  defaultName: string
  /** Tops × bottoms + one-pieces on the list; more than the planned outfits means there's room to mix. */
  possibleCount: number
  plannedCount: number
}

/** "Suggest outfits from what I'm packing": new pairings of items already on the list. */
export function TripSuggestions({ wardrobeId, tripId, defaultName, possibleCount, plannedCount }: TripSuggestionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionResult[] | null>(null)

  const keyOf = (suggestion: SuggestionResult) => suggestion.items.map((item) => item.id).join('|')

  const suggest = async () => {
    setLoading(true)
    const res = await fetch(`/api/trips/${tripId}/suggestions?wardrobeId=${wardrobeId}`, { method: 'POST' })
    setLoading(false)

    if (!res.ok) {
      toast.error('Could not get suggestions. Please try again.')
      return
    }
    setSuggestions((await res.json()).suggestions)
  }

  const add = async (suggestion: SuggestionResult) => {
    const key = keyOf(suggestion)
    setSavingKey(key)
    const res = await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardrobeId,
        tripId,
        name: defaultName,
        itemIds: suggestion.items.map((item) => item.id),
        tags: [],
      }),
    })

    if (!res.ok) {
      setSavingKey(null)
      toast.error('Could not save this outfit. Please try again.')
      return
    }

    const created: { id: string } = await res.json()
    await saveOutfitPictureQuietly(created.id, wardrobeId)
    toast.success('Outfit added to the trip.')
    setSavingKey(null)
    // Saved ones leave the list; the rest stay to pick from.
    setSuggestions((current) => current?.filter((other) => keyOf(other) !== key) ?? null)
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-medium text-foreground">Mix and match</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {possibleCount > plannedCount
              ? `What you're packing could make up to ${possibleCount} outfits — ${plannedCount} are planned so far.`
              : 'New outfits from what you’re already packing, so you can bring less.'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={suggest} loading={loading} disabled={loading}>
          <Sparkles size={16} />
          {suggestions ? 'Suggest again' : 'Suggest outfits'}
        </Button>
      </div>

      {suggestions?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No new combinations to suggest. Every top and bottom on the list is already paired up in an outfit, or
          there isn&apos;t a top and bottom (or a dress) to build one from.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((suggestion) => {
            const key = keyOf(suggestion)
            return (
              <div key={key} className="flex flex-col rounded-lg border border-border p-3">
                <ul className="grid grid-cols-3 gap-2">
                  {suggestion.items.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                        <Image src={item.imageUrl} alt="" fill className="object-contain" sizes="100px" />
                      </div>
                      <p className="mt-1 truncate text-xs text-foreground">{item.name}</p>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  loading={savingKey === key}
                  disabled={savingKey !== null}
                  onClick={() => add(suggestion)}
                >
                  <Plus size={16} />
                  Add to trip
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
