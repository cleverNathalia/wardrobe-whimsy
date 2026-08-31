export type ImageSource = 'manual' | 'google_photos'
export type ItemStatus = 'DRAFT' | 'ACTIVE'

export interface ClothingItem {
  id: string
  userId: string
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
  createdAt: string
  updatedAt: string
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
  userId: string
  name: string
  occasion: string | null
  season: string | null
  notes: string | null
  tags: string[]
  coverImageFileId: string | null
  coverImageUrl: string | null
  createdAt: string
  updatedAt: string
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
