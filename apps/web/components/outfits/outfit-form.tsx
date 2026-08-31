'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { SEASONS, OCCASIONS } from '@wardrobe-whimsy/api-client'
import { IS_DEMO_MODE } from '@/lib/demo'
import type { ClothingItem } from '@/lib/wardrobe-types'
import { ItemPickerGrid } from './item-picker-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MetaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  occasion: z.string().optional(),
  season: z.string().optional(),
  notes: z.string().max(500).optional(),
})
type Meta = z.infer<typeof MetaSchema>

interface OutfitFormProps {
  wardrobeItems: ClothingItem[]
}

export function OutfitForm({ wardrobeItems }: OutfitFormProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [itemsError, setItemsError] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Meta>({
    resolver: zodResolver(MetaSchema),
  })

  const onSubmit = async (data: Meta) => {
    if (IS_DEMO_MODE) {
      toast.info('Sign in to save outfits.')
      return
    }
    if (selectedIds.length === 0) {
      setItemsError(true)
      return
    }
    setItemsError(false)

    const res = await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, itemIds: selectedIds, tags: [] }),
    })

    if (!res.ok) {
      toast.error('Failed to save outfit. Please try again.')
      return
    }

    toast.success('Outfit created!')
    router.push('/outfits')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      <div className="space-y-5">
        <h2 className="font-serif text-lg font-medium">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="e.g. Sunday brunch look" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Occasion</Label>
            <Select onValueChange={(v) => setValue('occasion', v)}>
              <SelectTrigger><SelectValue placeholder="Any occasion" /></SelectTrigger>
              <SelectContent>
                {OCCASIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Season</Label>
            <Select onValueChange={(v) => setValue('season', v)}>
              <SelectTrigger><SelectValue placeholder="Any season" /></SelectTrigger>
              <SelectContent>
                {SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Any notes about this outfit…" {...register('notes')} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium">Items</h2>
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
          )}
        </div>
        {itemsError && <p className="text-xs text-destructive">Select at least one item.</p>}
        <ItemPickerGrid
          items={wardrobeItems}
          selectedIds={selectedIds}
          onChange={(ids) => { setSelectedIds(ids); if (ids.length > 0) setItemsError(false) }}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>Save outfit</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
