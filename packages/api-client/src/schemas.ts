import { z } from 'zod'

export const CATEGORIES = [
  'Activewear',
  'Bags',
  'Belts',
  'Blazers',
  'Bodysuits',
  'Cardigans',
  'Coats',
  'Dresses',
  'Footwear',
  'Glasses',
  'Hair Accessories',
  'Hats',
  'Hosiery',
  'Jackets',
  'Jeans',
  'Jewelry',
  'Jumpsuits',
  'Lingerie',
  'Loungewear',
  'Overalls',
  'Pants',
  'Robes',
  'Rompers',
  'Scarves',
  'Shapewear',
  'Shorts',
  'Shrugs',
  'Skirts',
  'Sleepwear',
  'Suits',
  'Sweaters',
  'Sweatshirts',
  'Swimwear',
  'Ties',
  'Tops',
  'Underwear',
  'Vests',
  'Other',
  'Other Accessories',
] as const

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All seasons'] as const

export const OCCASIONS = ['Casual', 'Work', 'Formal', 'Evening', 'Sport', 'Beach', 'Travel'] as const

export const ClothingItemCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().max(100).optional(),
  colour: z.string().max(50).optional(),
  season: z.string().optional(),
  occasion: z.string().optional(),
  brand: z.string().max(100).optional(),
  size: z.string().max(20).optional(),
  imageUrl: z.string().url('Image URL is required'),
  imagePublicId: z.string().min(1, 'Image public ID is required'),
  imageSource: z.enum(['manual', 'google_photos']),
  notes: z.string().max(500).optional(),
  isFavourite: z.boolean().optional(),
})

export const ClothingItemUpdateSchema = ClothingItemCreateSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
})

export type ClothingItemCreate = z.infer<typeof ClothingItemCreateSchema>
export type ClothingItemUpdate = z.infer<typeof ClothingItemUpdateSchema>

export const OutfitCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  occasion: z.string().optional(),
  season: z.string().optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  itemIds: z.array(z.string()).min(1, 'Select at least one item'),
})

export const OutfitUpdateSchema = OutfitCreateSchema.partial()

export type OutfitCreate = z.infer<typeof OutfitCreateSchema>
export type OutfitUpdate = z.infer<typeof OutfitUpdateSchema>

export const CloudinarySignResponseSchema = z.object({
  timestamp: z.number(),
  signature: z.string(),
  cloudName: z.string(),
  apiKey: z.string(),
  folder: z.string(),
})

export type CloudinarySignResponse = z.infer<typeof CloudinarySignResponseSchema>
