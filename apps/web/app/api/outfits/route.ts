import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { listOutfits, createOutfit, ItemsNotFoundError } from '@/lib/wardrobe-db'
import { DriveNotConnectedError } from '@/lib/google-drive'
import { OutfitCreateSchema } from '@wardrobe-whimsy/api-client'

export async function GET() {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const outfits = await listOutfits(userId)
    return NextResponse.json(outfits)
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

  const parsed = OutfitCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  try {
    const outfit = await createOutfit(userId, parsed.data)
    return NextResponse.json(outfit, { status: 201 })
  } catch (err) {
    if (err instanceof ItemsNotFoundError) {
      return NextResponse.json({ error: 'One or more items not found' }, { status: 404 })
    }
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}
