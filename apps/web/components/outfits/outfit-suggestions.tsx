'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Sparkles } from 'lucide-react'
import { OCCASIONS, SEASONS } from '@wardrobe-whimsy/api-client'
import { AppImage as Image } from '@/components/ui/app-image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { saveOutfitPictureQuietly } from '@/lib/outfit-picture'
import type { SuggestionResult } from '@/lib/suggestions/get-suggestions'

/** Radix Select cannot hold an empty value, so "any" needs a sentinel. */
const ANY = 'any'

interface OutfitSuggestionsProps {
  wardrobeId: string
  /** Pre-filled name for an outfit saved from a suggestion, e.g. "outfit-0012". */
  defaultName: string
}

export function OutfitSuggestions({ wardrobeId, defaultName }: OutfitSuggestionsProps) {
  const router = useRouter()
  const [occasion, setOccasion] = useState(ANY)
  const [season, setSeason] = useState(ANY)
  const [loading, setLoading] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionResult[] | null>(null)

  const suggest = async () => {
    setLoading(true)
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardrobeId,
        occasion: occasion === ANY ? undefined : occasion,
        season: season === ANY ? undefined : season,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      toast.error('Could not get suggestions. Please try again.')
      return
    }
    setSuggestions((await res.json()).suggestions)
  }

  const save = async (suggestion: SuggestionResult, index: number) => {
    setSavingIndex(index)
    const res = await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wardrobeId,
        name: defaultName,
        occasion: occasion === ANY ? undefined : occasion,
        season: season === ANY ? undefined : season,
        itemIds: suggestion.items.map((item) => item.id),
        tags: [],
      }),
    })

    if (!res.ok) {
      setSavingIndex(null)
      toast.error('Could not save this outfit. Please try again.')
      return
    }

    const created: { id: string } = await res.json()
    await saveOutfitPictureQuietly(created.id, wardrobeId)
    toast.success('Outfit saved! Give it a name and arrange its collage here.')
    router.push(`/outfits/${created.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-5">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="suggest-occasion">Occasion</Label>
          <Select value={occasion} onValueChange={setOccasion}>
            <SelectTrigger id="suggest-occasion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any occasion</SelectItem>
              {OCCASIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="suggest-season">Season</Label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger id="suggest-season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any season</SelectItem>
              {SEASONS.filter((s) => s !== 'All seasons').map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={suggest} loading={loading} disabled={loading}>
          <Sparkles size={16} />
          {suggestions ? 'Suggest again' : 'Suggest outfits'}
        </Button>
      </div>

      {suggestions?.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nothing to suggest for that yet. Suggestions need a top and a bottom, or a dress or jumpsuit, that suit
          the occasion and season. Try &ldquo;Any&rdquo;, or add more items to your wardrobe.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((suggestion, index) => (
            <section
              key={suggestion.items.map((item) => item.id).join('|')}
              className="flex flex-col rounded-xl border border-border bg-card p-4"
              aria-label={`Suggestion ${index + 1}`}
            >
              <ul className="grid grid-cols-3 gap-2">
                {suggestion.items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                      <Image src={item.imageUrl} alt="" fill className="object-contain" sizes="120px" />
                    </div>
                    <p className="mt-1 truncate text-xs text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.category}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{suggestion.reason}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                loading={savingIndex === index}
                disabled={savingIndex !== null}
                onClick={() => save(suggestion, index)}
              >
                <Save size={16} />
                Save as outfit
              </Button>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
