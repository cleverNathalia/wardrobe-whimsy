import type { ClothingItem, OutfitWithItems } from '@/lib/wardrobe-types'

export type { OutfitWithItems }

export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export const DEMO_USER = { id: 'demo' }

const D = new Date('2024-06-01T12:00:00.000Z').toISOString()

const makeOutfitItem = (outfitId: string, item: ClothingItem, idx: number) => ({
  id: `demo-oi-${outfitId}-${idx}`,
  outfitId,
  clothingItemId: item.id,
  positionX: 0, positionY: 0, scale: 1, rotation: 0, zIndex: idx,
  clothingItem: { id: item.id, name: item.name, category: item.category, imageUrl: item.imageUrl },
})

export const DEMO_OUTFITS: OutfitWithItems[] = []

// Populated after DEMO_ITEMS is defined below
export const DEMO_ITEMS: ClothingItem[] = [
  {
    id: 'demo-1', userId: 'demo',
    name: 'White linen shirt', category: 'TOP', subcategory: 'Button-up',
    colour: 'White', season: 'SUMMER', occasion: 'CASUAL',
    brand: 'Uniqlo', size: 'M',
    imageUrl: 'https://picsum.photos/seed/ww-shirt/800/800',
    imageFileId: 'demo/ww-shirt', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: true,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-2', userId: 'demo',
    name: 'Navy slim chinos', category: 'BOTTOM', subcategory: null,
    colour: 'Navy', season: 'ALL', occasion: 'SMART_CASUAL',
    brand: null, size: '32',
    imageUrl: 'https://picsum.photos/seed/ww-chinos/800/800',
    imageFileId: 'demo/ww-chinos', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: false,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-3', userId: 'demo',
    name: 'Black leather jacket', category: 'OUTERWEAR', subcategory: null,
    colour: 'Black', season: 'AUTUMN', occasion: 'CASUAL',
    brand: 'ASOS', size: 'M',
    imageUrl: 'https://picsum.photos/seed/ww-jacket/800/800',
    imageFileId: 'demo/ww-jacket', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: true,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-4', userId: 'demo',
    name: 'White sneakers', category: 'SHOES', subcategory: null,
    colour: 'White', season: 'ALL', occasion: 'CASUAL',
    brand: 'New Balance', size: '42',
    imageUrl: 'https://picsum.photos/seed/ww-sneakers/800/800',
    imageFileId: 'demo/ww-sneakers', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: false,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-5', userId: 'demo',
    name: 'Floral summer dress', category: 'DRESS', subcategory: null,
    colour: 'Floral', season: 'SUMMER', occasion: 'CASUAL',
    brand: 'Zara', size: 'S',
    imageUrl: 'https://picsum.photos/seed/ww-dress/800/800',
    imageFileId: 'demo/ww-dress', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: true,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-6', userId: 'demo',
    name: 'Canvas tote bag', category: 'BAG', subcategory: null,
    colour: 'Beige', season: 'ALL', occasion: 'CASUAL',
    brand: null, size: null,
    imageUrl: 'https://picsum.photos/seed/ww-bag/800/800',
    imageFileId: 'demo/ww-bag', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: false,
    createdAt: D, updatedAt: D,
  },
]

// Populate demo outfits now that DEMO_ITEMS is defined
DEMO_OUTFITS.push(
  {
    id: 'demo-outfit-1', userId: 'demo',
    name: 'Smart casual day', occasion: 'Casual', season: 'Summer',
    notes: null, tags: ['day-out', 'relaxed'],
    coverImageFileId: DEMO_ITEMS[0].imageFileId,
    coverImageUrl: DEMO_ITEMS[0].imageUrl,
    createdAt: D, updatedAt: D,
    items: [DEMO_ITEMS[0], DEMO_ITEMS[1], DEMO_ITEMS[3]].map((item, i) =>
      makeOutfitItem('demo-outfit-1', item, i),
    ),
  },
  {
    id: 'demo-outfit-2', userId: 'demo',
    name: 'Summer afternoon', occasion: 'Casual', season: 'Summer',
    notes: 'Great for a picnic', tags: ['summer', 'feminine'],
    coverImageFileId: DEMO_ITEMS[4].imageFileId,
    coverImageUrl: DEMO_ITEMS[4].imageUrl,
    createdAt: D, updatedAt: D,
    items: [DEMO_ITEMS[4], DEMO_ITEMS[5], DEMO_ITEMS[3]].map((item, i) =>
      makeOutfitItem('demo-outfit-2', item, i),
    ),
  },
)
