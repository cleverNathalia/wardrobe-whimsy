import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getClothingItem, updateClothingItem, deleteClothingItem, getOrCreateDefaultWardrobe } from '@/lib/wardrobe-db'
import { deleteFile, FolderNotConnectedError } from '@/lib/google-drive'
import { ClothingItemUpdateSchema } from '@wardrobe-whimsy/api-client'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const wardrobe = await getOrCreateDefaultWardrobe(userId)
    const item = await getClothingItem(wardrobe.id, userId, id)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (err) {
    if (err instanceof FolderNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ClothingItemUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  try {
    const wardrobe = await getOrCreateDefaultWardrobe(userId)
    const updated = await updateClothingItem(wardrobe.id, userId, id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof FolderNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const wardrobe = await getOrCreateDefaultWardrobe(userId)
    const { deleted, fileToDelete } = await deleteClothingItem(wardrobe.id, userId, id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (fileToDelete) await deleteFile(wardrobe.id, fileToDelete)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof FolderNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}
