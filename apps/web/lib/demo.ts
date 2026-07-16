import type { ClothingItem } from '@prisma/client'

export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export const DEMO_USER = {
  id: 'demo',
  clerkId: 'demo',
  email: 'demo@wardrobewhimsy.com',
  name: 'Demo User',
  image: null as string | null,
  createdAt: new Date('2024-06-01T12:00:00.000Z'),
  updatedAt: new Date('2024-06-01T12:00:00.000Z'),
}

const D = new Date('2024-06-01T12:00:00.000Z')

export const DEMO_ITEMS: ClothingItem[] = [
  {
    id: 'demo-1', userId: 'demo',
    name: 'White linen shirt', category: 'TOP', subcategory: 'Button-up',
    colour: 'White', season: 'SUMMER', occasion: 'CASUAL',
    brand: 'Uniqlo', size: 'M',
    imageUrl: 'https://picsum.photos/seed/ww-shirt/800/800',
    imagePublicId: 'demo/ww-shirt', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: true,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-2', userId: 'demo',
    name: 'Navy slim chinos', category: 'BOTTOM', subcategory: null,
    colour: 'Navy', season: 'ALL', occasion: 'SMART_CASUAL',
    brand: null, size: '32',
    imageUrl: 'https://picsum.photos/seed/ww-chinos/800/800',
    imagePublicId: 'demo/ww-chinos', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: false,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-3', userId: 'demo',
    name: 'Black leather jacket', category: 'OUTERWEAR', subcategory: null,
    colour: 'Black', season: 'AUTUMN', occasion: 'CASUAL',
    brand: 'ASOS', size: 'M',
    imageUrl: 'https://picsum.photos/seed/ww-jacket/800/800',
    imagePublicId: 'demo/ww-jacket', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: true,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-4', userId: 'demo',
    name: 'White sneakers', category: 'SHOES', subcategory: null,
    colour: 'White', season: 'ALL', occasion: 'CASUAL',
    brand: 'New Balance', size: '42',
    imageUrl: 'https://picsum.photos/seed/ww-sneakers/800/800',
    imagePublicId: 'demo/ww-sneakers', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: false,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-5', userId: 'demo',
    name: 'Floral summer dress', category: 'DRESS', subcategory: null,
    colour: 'Floral', season: 'SUMMER', occasion: 'CASUAL',
    brand: 'Zara', size: 'S',
    imageUrl: 'https://picsum.photos/seed/ww-dress/800/800',
    imagePublicId: 'demo/ww-dress', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: true,
    createdAt: D, updatedAt: D,
  },
  {
    id: 'demo-6', userId: 'demo',
    name: 'Canvas tote bag', category: 'BAG', subcategory: null,
    colour: 'Beige', season: 'ALL', occasion: 'CASUAL',
    brand: null, size: null,
    imageUrl: 'https://picsum.photos/seed/ww-bag/800/800',
    imagePublicId: 'demo/ww-bag', imageSource: 'manual',
    status: 'ACTIVE', notes: null, isFavourite: false,
    createdAt: D, updatedAt: D,
  },
]
