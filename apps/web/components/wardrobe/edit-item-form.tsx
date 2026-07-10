'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { ClothingItem } from '@prisma/client'
import { ClothingItemUpdateSchema, type ClothingItemUpdate, CATEGORIES, SEASONS, OCCASIONS } from '@wardrobe-whimsy/api-client'
import { getCategoryIcon } from '@/lib/category-icons'
import { ImageUploader } from './image-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EditItemFormProps {
  item: ClothingItem
}

export function EditItemForm({ item }: EditItemFormProps) {
  const router = useRouter()
  const [imageData, setImageData] = useState<{ imageUrl: string; imagePublicId: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const form = useForm<ClothingItemUpdate>({
    resolver: zodResolver(ClothingItemUpdateSchema),
    defaultValues: {
      name: item.name,
      category: item.category,
      subcategory: item.subcategory ?? '',
      colour: item.colour ?? '',
      season: item.season ?? '',
      occasion: item.occasion ?? '',
      brand: item.brand ?? '',
      size: item.size ?? '',
      notes: item.notes ?? '',
      isFavourite: item.isFavourite,
    },
  })

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = form

  const onSubmit = async (data: ClothingItemUpdate) => {
    const payload: ClothingItemUpdate = { ...data, status: 'ACTIVE' }
    if (imageData) {
      payload.imageUrl = imageData.imageUrl
      payload.imagePublicId = imageData.imagePublicId
    }

    const res = await fetch(`/api/clothing-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      toast.error('Failed to save changes. Please try again.')
      return
    }

    toast.success('Changes saved!')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/clothing-items/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete item.')
      setDeleting(false)
      return
    }
    toast.success('Item deleted.')
    router.push('/wardrobe')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <div className="space-y-3">
        <h2 className="font-serif text-lg font-medium">Photo</h2>
        <ImageUploader
          existingImageUrl={item.imageUrl}
          onUploadComplete={(result) => {
            setImageData(result)
            setValue('imageUrl', result.imageUrl)
            setValue('imagePublicId', result.imagePublicId)
          }}
        />
      </div>

      <div className="space-y-5">
        <h2 className="font-serif text-lg font-medium">Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" {...register('brand')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select defaultValue={item.category} onValueChange={(v) => setValue('category', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => {
                  const Icon = getCategoryIcon(c)
                  return (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <Icon size={14} className="text-muted-foreground shrink-0" />
                        {c}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Input id="subcategory" {...register('subcategory')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="colour">Colour</Label>
            <Input id="colour" {...register('colour')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="size">Size</Label>
            <Input id="size" {...register('size')} />
          </div>
          <div className="space-y-1.5">
            <Label>Season</Label>
            <Select defaultValue={item.season ?? ''} onValueChange={(v) => setValue('season', v)}>
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
          <Select defaultValue={item.occasion ?? ''} onValueChange={(v) => setValue('occasion', v)}>
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
          <Textarea id="notes" {...register('notes')} />
        </div>
      </div>

      <div className="flex gap-3 pt-2 flex-wrap">
        <Button type="submit" loading={isSubmitting}>Save changes</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button
          type="button"
          variant="destructive"
          loading={deleting}
          onClick={handleDelete}
          className="ml-auto"
        >
          Delete item
        </Button>
      </div>
    </form>
  )
}
