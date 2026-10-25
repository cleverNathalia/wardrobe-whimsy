export type ImageSource = 'manual' | 'google_photos'
export type ItemStatus = 'DRAFT' | 'ACTIVE'

/** Prisma hands back Date objects; API responses serialise them to strings. */
export type Timestamp = string | Date

export interface ClothingItem {
  id: string
  wardrobeId: string
  name: string
  category: string
  subcategory: string | null
  colour: string | null
  season: string | null
  occasion: string | null
  brand: string | null
  size: string | null
  imageUrl: string
  imageFileId: string
  imageSource: ImageSource
  status: ItemStatus
  notes: string | null
  isFavourite: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface OutfitItem {
  id: string
  outfitId: string
  clothingItemId: string
  positionX: number
  positionY: number
  scale: number
  rotation: number
  zIndex: number
}

export interface OutfitItemWithClothingItem extends OutfitItem {
  clothingItem: Pick<ClothingItem, 'id' | 'name' | 'category' | 'imageUrl'>
}

export interface Outfit {
  id: string
  wardrobeId: string
  name: string
  occasion: string | null
  season: string | null
  notes: string | null
  tags: string[]
  coverImageFileId: string | null
  coverImageUrl: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface OutfitWithItems extends Outfit {
  items: OutfitItemWithClothingItem[]
}

export interface WearLog {
  id: string
  outfitId: string
  wornAt: string
  notes: string | null
}

export interface Look {
  id: string
  wardrobeId: string
  outfitId: string | null
  imageUrl: string
  imageFileId: string
  imageSource: ImageSource
  notes: string | null
  wornAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** A look plus the outfit it was linked to, if any. */
export interface LookWithOutfit extends Look {
  outfit: OutfitWithItems | null
}

export type SwatchSource = 'picker' | 'image'

export interface ColourSwatch {
  id: string
  /** Lowercase six-digit hex, e.g. "#4f7942". */
  hex: string
  label: string | null
  source: SwatchSource
  order: number
}

/** A hand-built palette that outfits can be linked to. */
export interface ColourCombo {
  id: string
  wardrobeId: string
  /** Optional — see comboDisplayName for what an unnamed combo is called. */
  name: string | null
  notes: string | null
  /** In display order. */
  swatches: ColourSwatch[]
  outfitIds: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** A combo with its linked outfits in full, for drawing their collages. */
export interface ColourComboWithOutfits extends ColourCombo {
  outfits: OutfitWithItems[]
}
