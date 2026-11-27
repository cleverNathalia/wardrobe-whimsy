'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemPickerGrid } from '@/components/outfits/item-picker-grid'
import type { ClothingItem } from '@/lib/wardrobe-types'

interface LooseItemAdderProps {
  wardrobeId: string
  tripId: string
  /** Wardrobe items not already on the list. */
  items: ClothingItem[]
}

/** Adds things that aren't part of any outfit — swimwear, pyjamas, a rain jacket. */
export function LooseItemAdder({ wardrobeId, tripId, items }: LooseItemAdderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const add = async () => {
    setSaving(true)
    const results = await Promise.all(
      selected.map((itemId) =>
        fetch(`/api/trips/${tripId}/items/${itemId}?wardrobeId=${wardrobeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isLoose: true }),
        })
      )
    )
    setSaving(false)

    const failed = results.filter((res) => !res.ok).length
    if (failed) toast.error(`${failed} item${failed === 1 ? '' : 's'} could not be added.`)
    setSelected([])
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add items on their own
      </Button>
    )
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="font-serif text-lg font-medium text-foreground">Add items on their own</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          For things you&apos;ll pack that aren&apos;t in an outfit. They count towards your limits.
        </p>
      </div>
      <ItemPickerGrid items={items} selectedIds={selected} onChange={setSelected} />
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={add} loading={saving} disabled={saving || selected.length === 0}>
          Add {selected.length > 0 ? selected.length : ''} to the list
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </section>
  )
}
