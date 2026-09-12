'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ClothingItemCreateSchema, type ClothingItemCreate, CATEGORIES, SEASONS, OCCASIONS } from '@wardrobe-whimsy/api-client'
import { PhotoSourceSelector } from './photo-source-selector'
import { resolvePendingPhoto, type PendingPhoto } from '@/lib/pending-photo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon } from '@/lib/category-icons'

type FormValues = Omit<ClothingItemCreate, 'imageFileId'>

interface AddItemFormProps {
  /** Which wardrobe the new item belongs to. */
  wardrobeId: string
  googlePhotosEnabled?: boolean
}

export function AddItemForm({ wardrobeId, googlePhotosEnabled = false }: AddItemFormProps) {
  const router = useRouter()
  const [photo, setPhoto] = useState<{ pending: PendingPhoto; source: 'manual' | 'google_photos' } | null>(null)

  // imageFileId is omitted from validation because it does not exist until
  // submit — the photo is only uploaded once the user commits to saving.
  const form = useForm<FormValues>({
    resolver: zodResolver(ClothingItemCreateSchema.omit({ imageFileId: true })),
    defaultValues: {
      imageSource: 'manual',
      isFavourite: false as boolean,
    },
  })

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = form

  const onSubmit = async (data: FormValues) => {
    if (!photo) {
      toast.error('Please choose a photo first.')
      return
    }

    // The photo is uploaded here, once, rather than when it was chosen — so
    // abandoning this form leaves nothing behind in Drive.
    let uploaded
    try {
      uploaded = await resolvePendingPhoto(photo.pending, wardrobeId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the photo.')
      return
    }

    const res = await fetch('/api/clothing-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        imageFileId: uploaded.imageFileId,
        wardrobeId,
        imageSource: photo.source,
      }),
    })

    if (!res.ok) {
      toast.error('Failed to save item. Please try again.')
      return
    }

    toast.success('Item added to your wardrobe!')
    router.push('/wardrobe')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-medium">Photo</h2>
        <PhotoSourceSelector
          wardrobeId={wardrobeId}
          googlePhotosEnabled={googlePhotosEnabled}
          onChange={(pending, source) => {
            setPhoto(pending ? { pending, source } : null)
            setValue('imageSource', source)
          }}
        />
      </div>

      <div className="space-y-5">
        <h2 className="font-serif text-lg font-medium">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="e.g. Blue linen shirt" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" placeholder="e.g. Zara" {...register('brand')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select onValueChange={(v) => setValue('category', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon category={c} className="h-4 w-4 shrink-0" />
                      {c}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Input id="subcategory" placeholder="e.g. Button-up" {...register('subcategory')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="colour">Colour</Label>
            <Input id="colour" placeholder="e.g. Navy" {...register('colour')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="size">Size</Label>
            <Input id="size" placeholder="e.g. M, 38, 10" {...register('size')} />
          </div>

          <div className="space-y-1.5">
            <Label>Season</Label>
            <Select onValueChange={(v) => setValue('season', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any season" />
              </SelectTrigger>
              <SelectContent>
                {SEASONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Occasion</Label>
          <Select onValueChange={(v) => setValue('occasion', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Any occasion" />
            </SelectTrigger>
            <SelectContent>
              {OCCASIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Care instructions, where you bought it, etc." {...register('notes')} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!photo}>
          Add to wardrobe
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
