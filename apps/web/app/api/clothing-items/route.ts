import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { listClothingItems, createClothingItem } from '@/lib/wardrobe-db'
import { DriveNotConnectedError } from '@/lib/google-drive'
import { ClothingItemCreateSchema } from '@wardrobe-whimsy/api-client'

export async function GET() {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await listClothingItems(userId)
    return NextResponse.json(items)
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}

export async function POST(req: Request) {
  let userId: string
  try {
    userId = (await requireUser()).id
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

  try {
    const item = await createClothingItem(userId, parsed.data)
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}
