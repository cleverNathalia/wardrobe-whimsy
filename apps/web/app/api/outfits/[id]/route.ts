import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { OutfitUpdateSchema } from '@wardrobe-whimsy/api-client'

type RouteContext = { params: Promise<{ id: string }> }

const INCLUDE = {
  items: {
    include: {
      clothingItem: { select: { id: true, name: true, category: true, imageUrl: true } },
    },
    orderBy: { zIndex: 'asc' as const },
  },
}

export async function GET(_req: Request, { params }: RouteContext) {
  let user
  try { user = await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const outfit = await prisma.outfit.findFirst({ where: { id, userId: user.id }, include: INCLUDE })
  if (!outfit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(outfit)
}

export async function PATCH(req: Request, { params }: RouteContext) {
  let user
  try { user = await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.outfit.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = OutfitUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { itemIds, tags, ...rest } = parsed.data

  // If itemIds provided, replace all outfit items
  let coverImageUrl = existing.coverImageUrl
  if (itemIds && itemIds.length > 0) {
    const items = await prisma.clothingItem.findMany({
      where: { id: { in: itemIds }, userId: user.id },
      select: { id: true, imageUrl: true },
    })
    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more items not found' }, { status: 404 })
    }
    coverImageUrl = items[0].imageUrl

    await prisma.outfitItem.deleteMany({ where: { outfitId: id } })
    await prisma.outfitItem.createMany({
      data: itemIds.map((clothingItemId, i) => ({ outfitId: id, clothingItemId, zIndex: i })),
    })
  }

  const updated = await prisma.outfit.update({
    where: { id },
    data: {
      ...rest,
      ...(tags !== undefined && { tags }),
      ...(coverImageUrl !== existing.coverImageUrl && { coverImageUrl }),
    },
    include: INCLUDE,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  let user
  try { user = await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.outfit.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.outfit.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
