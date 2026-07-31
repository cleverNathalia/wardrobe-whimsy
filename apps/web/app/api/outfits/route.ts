import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { OutfitCreateSchema } from '@wardrobe-whimsy/api-client'

const INCLUDE = {
  items: {
    include: {
      clothingItem: { select: { id: true, name: true, category: true, imageUrl: true } },
    },
    orderBy: { zIndex: 'asc' as const },
  },
}

export async function GET() {
  let user
  try { user = await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const outfits = await prisma.outfit.findMany({
    where: { userId: user.id },
    include: INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(outfits)
}

export async function POST(req: Request) {
  let user
  try { user = await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = OutfitCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { itemIds, tags, ...rest } = parsed.data

  // Verify all items belong to this user
  const items = await prisma.clothingItem.findMany({
    where: { id: { in: itemIds }, userId: user.id },
    select: { id: true, imageUrl: true },
  })
  if (items.length !== itemIds.length) {
    return NextResponse.json({ error: 'One or more items not found' }, { status: 404 })
  }

  const outfit = await prisma.outfit.create({
    data: {
      ...rest,
      tags: tags ?? [],
      userId: user.id,
      coverImageUrl: items[0].imageUrl,
      items: {
        create: itemIds.map((id, i) => ({
          clothingItemId: id,
          zIndex: i,
        })),
      },
    },
    include: INCLUDE,
  })

  return NextResponse.json(outfit, { status: 201 })
}
