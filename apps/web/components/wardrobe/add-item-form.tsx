'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ClothingItemCreateSchema, type ClothingItemCreate, CATEGORIES, SEASONS, OCCASIONS } from '@wardrobe-whimsy/api-client'
import { ImageUploader } from './image-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon } from '@/lib/category-icons'

export function AddItemForm() {
  const router = useRouter()
  const [imageData, setImageData] = useState<{ imageUrl: string; imagePublicId: string } | null>(null)

  const form = useForm<ClothingItemCreate>({
    resolver: zodResolver(ClothingItemCreateSchema),
    defaultValues: {
      imageSource: 'manual',
      isFavourite: false as boolean,
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form

  const onSubmit = async (data: ClothingItemCreate) => {
    if (!imageData) {
      toast.error('Please upload an image first.')
      return
    }

    const res = await fetch('/api/clothing-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...imageData, imageSource: 'manual' }),
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
        <ImageUploader
          onUploadComplete={(result) => {
            setImageData(result)
            setValue('imageUrl', result.imageUrl)
            setValue('imagePublicId', result.imagePublicId)
          }}
        />
        {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
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
        <Button type="submit" loading={isSubmitting} disabled={!imageData}>
          Add to wardrobe
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
