import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { ClothingItemCreateSchema } from '@wardrobe-whimsy/api-client'

export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await prisma.clothingItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(items)
}

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ClothingItemCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const item = await prisma.clothingItem.create({
    data: {
      ...parsed.data,
      isFavourite: parsed.data.isFavourite ?? false,
      userId: user.id,
      status: 'ACTIVE',
    },
  })

  return NextResponse.json(item, { status: 201 })
}
