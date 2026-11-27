'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Check, X } from 'lucide-react'
import { AppImage as Image } from '@/components/ui/app-image'
import { cn } from '@/lib/utils'
import { packingHeadline } from '@/lib/trips/format'
import type { PackingList as PackingListData, PackingListGroup, PackingListItem } from '@/lib/trips/packing-list'

interface PackingListProps {
  wardrobeId: string
  tripId: string
  list: PackingListData
  /** Outfit names by id, to say which outfit pushed a group over its limit. */
  outfitNames: Record<string, string>
}

/**
 * The trip's packing list, grouped by type. Ticks are saved one at a time and
 * shown straight away; a failed save puts the tick back.
 *
 * Rendered with `key` set to the trip's list version by the page, so local
 * ticks reset whenever the server sends a different list.
 */
export function PackingList({ wardrobeId, tripId, list, outfitNames }: PackingListProps) {
  const router = useRouter()
  // Ticks the server hasn't confirmed yet, so the box responds immediately.
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const isPacked = (item: PackingListItem) => pending[item.id] ?? item.packed
  const packedCount = list.groups.flatMap((g) => g.items).filter(isPacked).length

  const saveItem = async (itemId: string, change: { packed?: boolean; isLoose?: boolean }) => {
    const res = await fetch(`/api/trips/${tripId}/items/${itemId}?wardrobeId=${wardrobeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    })
    return res.ok
  }

  const togglePacked = async (item: PackingListItem) => {
    const packed = !isPacked(item)
    setPending((current) => ({ ...current, [item.id]: packed }))
    if (await saveItem(item.id, { packed })) {
      // The tick stays as it is: it now matches what's saved, and dropping it
      // before the refreshed list arrives would flash the old state.
      router.refresh()
      return
    }
    toast.error(`Could not save "${item.name}". Please try again.`)
    setPending((current) => {
      const next = { ...current }
      delete next[item.id]
      return next
    })
  }

  const removeLoose = async (item: PackingListItem) => {
    if (!(await saveItem(item.id, { isLoose: false }))) {
      toast.error(`Could not remove "${item.name}".`)
      return
    }
    router.refresh()
  }

  if (list.itemCount === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nothing to pack yet. Add outfits to this trip, or add items on their own.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">{packingHeadline(list.baseCounts, list.outfitCount)}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-120"
            style={{ width: `${(packedCount / list.itemCount) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Packed {packedCount} / {list.itemCount}
        </p>
      </div>

      {list.groups.map((group) => (
        <PackingGroupSection
          key={group.group}
          group={group}
          outfitNames={outfitNames}
          isPacked={isPacked}
          onTogglePacked={togglePacked}
          onRemoveLoose={removeLoose}
        />
      ))}
    </div>
  )
}

interface PackingGroupSectionProps {
  group: PackingListGroup
  outfitNames: Record<string, string>
  isPacked: (item: PackingListItem) => boolean
  onTogglePacked: (item: PackingListItem) => void
  onRemoveLoose: (item: PackingListItem) => void
}

function PackingGroupSection({ group, outfitNames, isPacked, onTogglePacked, onRemoveLoose }: PackingGroupSectionProps) {
  const count = group.items.length
  const over = group.overflowItemIds.length > 0
  const byId = new Map(group.items.map((item) => [item.id, item]))

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg font-medium text-foreground">{group.label}</h3>
        <span className={cn('text-sm tabular-nums', over ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {group.limit === null ? count : `${count} / ${group.limit}`}
        </span>
      </div>

      {over && (
        <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Over by {group.overflowItemIds.length}:{' '}
            {group.overflowItemIds
              .map((id) => {
                const item = byId.get(id)!
                const from = item.outfitIds[0] ? `from ${outfitNames[item.outfitIds[0]] ?? 'an outfit'}` : 'added on its own'
                return `${item.name} (${from})`
              })
              .join(', ')}
          </span>
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {group.items.map((item) => {
          const packed = isPacked(item)
          return (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={packed}
                aria-label={`Packed: ${item.name}`}
                onClick={() => onTogglePacked(item)}
                className="flex min-h-(--touch-target) min-w-(--touch-target) shrink-0 items-center justify-center"
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-md border-2 transition-colors',
                    packed ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  )}
                >
                  {packed && <Check size={14} />}
                </span>
              </button>
              <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium', packed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">{describe(item)}</p>
              </div>
              {item.weakLink && !item.loose && (
                <span
                  className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  title="Only one outfit uses this — the first thing to cut if you want to pack lighter."
                >
                  1 outfit only
                </span>
              )}
              {item.loose && (
                <button
                  type="button"
                  aria-label={`Take ${item.name} off the list`}
                  onClick={() => onRemoveLoose(item)}
                  className="flex min-h-(--touch-target) min-w-(--touch-target) shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function describe(item: PackingListItem): string {
  const n = item.outfitIds.length
  if (item.orphanedPacked) return 'Packed, but no longer in any outfit'
  if (n === 0) return 'Not in any outfit yet'
  const inOutfits = `In ${n} outfit${n === 1 ? '' : 's'}`
  return item.loose ? `${inOutfits} · also added on its own` : inOutfits
}
