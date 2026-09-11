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
  imageSource: string
  status: string
  notes: string | null
  isFavourite: boolean
  createdAt: string | Date
  updatedAt: string | Date
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
  createdAt: string | Date
  updatedAt: string | Date
}

export interface OutfitWithItems extends Outfit {
  items: OutfitItemWithClothingItem[]
}

export interface WearLog {
  id: string
  wardrobeId: string
  outfitId: string
  wornAt: string | Date
  notes: string | null
}
