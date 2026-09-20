'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AppImage as Image } from '@/components/ui/app-image'
import type { LookWithOutfit, Outfit } from '@/lib/wardrobe-types'
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

interface EditLookFormProps {
  /** Which wardrobe this look belongs to — every look endpoint is scoped by it. */
  wardrobeId: string
  look: LookWithOutfit
  outfits: Outfit[]
  googlePhotosEnabled?: boolean
}

export function EditLookForm({ wardrobeId, look, outfits, googlePhotosEnabled = false }: EditLookFormProps) {
  const router = useRouter()
  const [photo, setPhoto] = useState<{ pending: PendingPhoto; source: 'manual' | 'google_photos' } | null>(null)
  const [outfitId, setOutfitId] = useState<string | null>(look.outfitId)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Meta>({
    resolver: zodResolver(MetaSchema),
    defaultValues: {
      wornAt: toDateInputValue(look.wornAt),
      notes: look.notes ?? '',
    },
  })

  const onSubmit = async (data: Meta) => {
    const payload: Record<string, unknown> = { ...data, outfitId }

    // Only uploaded if the photo was actually replaced. The old Drive file is
    // left for the orphan sweep rather than deleted here, so a failed save
    // cannot destroy the only copy of the photo.
    if (photo) {
      try {
        payload.imageFileId = (await resolvePendingPhoto(photo.pending, wardrobeId)).imageFileId
        payload.imageSource = photo.source
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not upload the photo.')
        return
      }
    }

    const res = await fetch(`/api/looks/${look.id}?wardrobeId=${wardrobeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      toast.error('Failed to save changes.')
      return
    }

    toast.success('Look saved!')
    router.push('/looks')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this look? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/looks/${look.id}?wardrobeId=${wardrobeId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete look.')
      setDeleting(false)
      return
    }
    toast.success('Look deleted.')
    router.push('/looks')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* The photo, shown large — it is the whole point of a look. */}
        <div className="space-y-3">
          <h2 className="font-serif text-lg font-medium">Photo</h2>
          <div className="aspect-[3/4] relative rounded-xl overflow-hidden border border-border bg-muted">
            <Image
              src={look.imageUrl}
              alt={look.outfit ? `Wearing ${look.outfit.name}` : 'A look'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
          <PhotoSourceSelector
            wardrobeId={wardrobeId}
            googlePhotosEnabled={googlePhotosEnabled}
            onChange={(pending, source) => setPhoto(pending ? { pending, source } : null)}
          />
        </div>

        <div className="space-y-5">
          <h2 className="font-serif text-lg font-medium">Details</h2>

          <div className="space-y-1.5">
            <Label htmlFor="wornAt">Worn on *</Label>
            <Input id="wornAt" type="date" {...register('wornAt')} />
            {errors.wornAt && <p className="text-xs text-destructive">{errors.wornAt.message}</p>}
          </div>

          <OutfitLinkSelect outfits={outfits} value={outfitId} onChange={setOutfitId} />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          {/* The collage this look recreates, when one is linked. */}
          {look.outfit && look.outfit.items.length > 0 && (
            <div className="space-y-2">
              <Label>{look.outfit.name}</Label>
              <div className="flex gap-2 flex-wrap">
                {look.outfit.items.slice(0, 6).map((outfitItem) => (
                  <div
                    key={outfitItem.id}
                    className="relative w-14 h-14 rounded-md overflow-hidden border border-border bg-muted"
                  >
                    <Image
                      src={outfitItem.clothingItem.imageUrl}
                      alt={outfitItem.clothingItem.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2 flex-wrap">
        <Button type="submit" loading={isSubmitting}>Save changes</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="button" variant="destructive" loading={deleting} onClick={handleDelete} className="ml-auto">
          Delete look
        </Button>
      </div>
    </form>
  )
}
