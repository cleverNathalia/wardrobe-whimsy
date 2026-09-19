'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Outfit } from '@/lib/wardrobe-types'
import { PhotoSourceSelector } from '@/components/wardrobe/photo-source-selector'
import { resolvePendingPhoto, type PendingPhoto } from '@/lib/pending-photo'
import { OutfitLinkSelect } from './outfit-link-select'
import { toDateInputValue } from './look-date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MetaSchema = z.object({
  wornAt: z.string().min(1, 'Pick a date'),
  notes: z.string().max(500).optional(),
})
type Meta = z.infer<typeof MetaSchema>

interface LookFormProps {
  /** Which wardrobe the new look belongs to. */
  wardrobeId: string
  /** Outfits available to link to. May be empty — the link is optional. */
  outfits: Outfit[]
  googlePhotosEnabled?: boolean
}

export function LookForm({ wardrobeId, outfits, googlePhotosEnabled = false }: LookFormProps) {
  const router = useRouter()
  const [photo, setPhoto] = useState<{ pending: PendingPhoto; source: 'manual' | 'google_photos' } | null>(null)
  const [outfitId, setOutfitId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Meta>({
    resolver: zodResolver(MetaSchema),
    // Looks are usually logged the same day, so today is the useful default —
    // the field stays editable for backdating older photos.
    defaultValues: { wornAt: toDateInputValue(new Date()) },
  })

  const onSubmit = async (data: Meta) => {
    if (!photo) {
      toast.error('Please choose a photo first.')
      return
    }

    // Uploaded here rather than when the photo was chosen, so abandoning this
    // form leaves nothing behind in Drive.
    let uploaded
    try {
      uploaded = await resolvePendingPhoto(photo.pending, wardrobeId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the photo.')
      return
    }

    const res = await fetch('/api/looks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        wardrobeId,
        imageFileId: uploaded.imageFileId,
        imageSource: photo.source,
        outfitId,
      }),
    })

    if (!res.ok) {
      toast.error('Failed to save look. Please try again.')
      return
    }

    toast.success('Look added!')
    router.push('/looks')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-medium">Photo</h2>
        <PhotoSourceSelector
          wardrobeId={wardrobeId}
          googlePhotosEnabled={googlePhotosEnabled}
          onChange={(pending, source) => setPhoto(pending ? { pending, source } : null)}
        />
      </div>

      <div className="space-y-5">
        <h2 className="font-serif text-lg font-medium">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wornAt">Worn on *</Label>
            <Input id="wornAt" type="date" {...register('wornAt')} />
            {errors.wornAt && <p className="text-xs text-destructive">{errors.wornAt.message}</p>}
          </div>

          <OutfitLinkSelect outfits={outfits} value={outfitId} onChange={setOutfitId} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Where you wore it, how it felt, what you'd change…" {...register('notes')} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!photo}>
          Save look
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
