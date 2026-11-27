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
  'Long Sleeve Shirts',
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
  'Sweatpants',
  'Sweatshirts',
  'Swimwear',
  'Ties',
  'Tops',
  'Underwear',
  'Vests',
  'Other',
  'Other Accessories',
] as const

/**
 * What part of an outfit a category plays. The outfit suggester fills slots
 * from these and a trip's packing list is grouped by them, so a new category
 * only needs adding here. Anything not listed is `other`.
 */
export const CATEGORY_GROUPS = {
  top: ['Tops', 'Long Sleeve Shirts', 'Bodysuits', 'Sweaters', 'Sweatshirts'],
  bottom: ['Jeans', 'Pants', 'Sweatpants', 'Shorts', 'Skirts'],
  onePiece: ['Dresses', 'Jumpsuits', 'Rompers', 'Overalls', 'Suits'],
  layer: ['Jackets', 'Coats', 'Blazers', 'Cardigans', 'Shrugs', 'Vests'],
  shoes: ['Footwear'],
  accessory: ['Bags', 'Jewelry', 'Scarves', 'Hats', 'Belts', 'Glasses', 'Hair Accessories', 'Other Accessories'],
} as const satisfies Record<string, readonly (typeof CATEGORIES)[number][]>

/** In the order a packing list shows them. */
export const PACKING_GROUPS = ['top', 'bottom', 'onePiece', 'layer', 'shoes', 'accessory', 'other'] as const

export type PackingGroup = (typeof PACKING_GROUPS)[number]

export const PACKING_GROUP_LABELS: Record<PackingGroup, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  onePiece: 'Dresses & one-pieces',
  layer: 'Layers',
  shoes: 'Shoes',
  accessory: 'Accessories',
  other: 'Other',
}

export function categoryGroup(category: string): PackingGroup {
  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
    if ((categories as readonly string[]).includes(category)) return group as PackingGroup
  }
  return 'other'
}

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
  imageFileId: z.string().min(1, 'An image is required'),
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
  /** Set when the outfit is made from a trip's page: it's added to that trip. */
  tripId: z.string().min(1).optional(),
})

export const OutfitUpdateSchema = OutfitCreateSchema.omit({ tripId: true }).partial()

export type OutfitCreate = z.infer<typeof OutfitCreateSchema>
export type OutfitUpdate = z.infer<typeof OutfitUpdateSchema>

/**
 * One item's place in a collage.
 *
 * Positions are normalised 0–1 fractions of the stage rather than pixels, and
 * scale is relative to a base item size, so a saved arrangement renders
 * identically on a 360px phone and a 1400px desktop — and will render the same
 * again in the native app, which reads this same layout read-only.
 */
export const OutfitLayoutEntrySchema = z.object({
  clothingItemId: z.string().min(1),
  positionX: z.number().min(0).max(1),
  positionY: z.number().min(0).max(1),
  scale: z.number().min(0.25).max(3),
  // Full turn either way; the editor normalises into this range before saving.
  rotation: z.number().min(-180).max(180),
  zIndex: z.number().int().min(0),
})

export const OutfitLayoutUpdateSchema = z.object({
  items: z.array(OutfitLayoutEntrySchema),
})

export type OutfitLayoutEntry = z.infer<typeof OutfitLayoutEntrySchema>
export type OutfitLayoutUpdate = z.infer<typeof OutfitLayoutUpdateSchema>

/**
 * A Look is a photo of the wearer, so the only required field is the photo
 * itself — `outfitId` is optional because a look is worth keeping even when it
 * was never built as a structured outfit.
 */
export const LookCreateSchema = z.object({
  imageFileId: z.string().min(1, 'A photo is required'),
  imageSource: z.enum(['manual', 'google_photos']),
  outfitId: z.string().nullish(),
  notes: z.string().max(500).optional(),
  // Backdating is expected — looks are usually logged after the fact.
  wornAt: z.coerce.date().optional(),
})

export const LookUpdateSchema = LookCreateSchema.partial()

export type LookCreate = z.infer<typeof LookCreateSchema>
export type LookUpdate = z.infer<typeof LookUpdateSchema>

/**
 * Logging that an outfit was worn, without a photo — a Look is the version
 * with one. `wornAt` is a calendar date; the client sends the user's local
 * date so "today" means their today, not the server's.
 */
export const WearLogCreateSchema = z.object({
  outfitId: z.string().min(1),
  wornAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
})

export type WearLogCreate = z.infer<typeof WearLogCreateSchema>

/**
 * Asking for outfit suggestions (FR-7.1). Both filters are optional: an item
 * with no occasion or season set is treated as suiting any.
 */
export const SuggestionRequestSchema = z.object({
  occasion: z.enum(OCCASIONS).optional(),
  season: z.enum(SEASONS).optional(),
  limit: z.number().int().min(1).max(5).optional(),
})

export type SuggestionRequest = z.infer<typeof SuggestionRequestSchema>

/** Six-digit hex, normalised to lowercase so equal colours compare equal. */
export const HexColourSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #4f7942')
  .transform((hex) => hex.toLowerCase())

export const ColourSwatchInputSchema = z.object({
  hex: HexColourSchema,
  label: z.string().trim().max(30).optional(),
  /** Where the colour came from. A sampled photo is not kept, only its colour. */
  source: z.enum(['picker', 'image']),
})

/**
 * A Colour Combo: a hand-built palette that outfits can be linked to. The
 * name is optional — an unnamed combo is labelled from its colours. Swatches
 * are stored in the order given.
 */
export const ColourComboCreateSchema = z.object({
  name: z.string().trim().max(60).optional(),
  notes: z.string().max(500).optional(),
  swatches: z.array(ColourSwatchInputSchema).min(1, 'Add at least one colour').max(12),
  outfitIds: z.array(z.string().min(1)).optional(),
})

/** Sending `swatches` or `outfitIds` replaces that whole list. */
export const ColourComboUpdateSchema = ColourComboCreateSchema.partial()

/** Replaces the combos one outfit belongs to, from the outfit's side. */
export const OutfitColourCombosUpdateSchema = z.object({
  comboIds: z.array(z.string().min(1)),
})

/** A cap per packing group, e.g. `{ top: 5, shoes: 2 }`. A group left out has none. */
export const PackingLimitsSchema = z.record(z.enum(PACKING_GROUPS), z.number().int().min(1).max(99))

const TripFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  notes: z.string().max(500).optional(),
  /** Calendar dates (`YYYY-MM-DD`), stored at midnight UTC like `wornAt`. */
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  /** Null clears every limit. */
  limits: PackingLimitsSchema.nullish(),
  outfitIds: z.array(z.string().min(1)).optional(),
})

type TripDates = { startDate?: Date | null; endDate?: Date | null }

/** Both dates or neither, and the trip can't end before it starts. */
function checkTripDates(data: TripDates, ctx: z.RefinementCtx) {
  const hasStart = data.startDate != null
  const hasEnd = data.endDate != null
  if (hasStart !== hasEnd) {
    ctx.addIssue({ code: 'custom', path: [hasStart ? 'endDate' : 'startDate'], message: 'Set both dates, or neither' })
  } else if (hasStart && hasEnd && data.endDate! < data.startDate!) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'The trip ends before it starts' })
  }
}

/** A trip: a named set of outfits to pack for, with optional dates and per-group limits. */
export const TripCreateSchema = TripFieldsSchema.superRefine(checkTripDates)

/**
 * Fields left out are left alone; `outfitIds`, when sent, replaces the list.
 * The dates travel together — sending one without the other is rejected.
 */
export const TripUpdateSchema = TripFieldsSchema.partial().superRefine((data, ctx) => {
  if ('startDate' in data || 'endDate' in data) checkTripDates(data, ctx)
})

/** Replaces which outfits are in a trip. */
export const TripOutfitsUpdateSchema = z.object({
  outfitIds: z.array(z.string().min(1)),
})

/** One item's state on a trip's list: added on its own, and/or ticked as packed. */
export const TripItemUpdateSchema = z
  .object({ isLoose: z.boolean().optional(), packed: z.boolean().optional() })
  .refine((data) => data.isLoose !== undefined || data.packed !== undefined, 'Send isLoose or packed')

/** Replaces the trips one outfit is in, from the outfit's side. */
export const OutfitTripsUpdateSchema = z.object({
  tripIds: z.array(z.string().min(1)),
})

export type PackingLimits = z.infer<typeof PackingLimitsSchema>
export type TripCreate = z.infer<typeof TripCreateSchema>
export type TripUpdate = z.infer<typeof TripUpdateSchema>
export type TripItemUpdate = z.infer<typeof TripItemUpdateSchema>

export type ColourSwatchInput = z.infer<typeof ColourSwatchInputSchema>
export type ColourComboCreate = z.infer<typeof ColourComboCreateSchema>
export type ColourComboUpdate = z.infer<typeof ColourComboUpdateSchema>

export const DriveUploadResponseSchema = z.object({
  imageFileId: z.string(),
  imageUrl: z.string(),
})

export type DriveUploadResponse = z.infer<typeof DriveUploadResponseSchema>
