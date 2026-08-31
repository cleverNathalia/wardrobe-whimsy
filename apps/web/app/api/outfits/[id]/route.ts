import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getOutfit, updateOutfit, deleteOutfit, ItemsNotFoundError } from '@/lib/wardrobe-store'
import { DriveNotConnectedError } from '@/lib/google-drive'
import { OutfitUpdateSchema } from '@wardrobe-whimsy/api-client'

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
    const outfit = await getOutfit(userId, id)
    if (!outfit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(outfit)
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
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

  const parsed = OutfitUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  try {
    const updated = await updateOutfit(userId, id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
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

export async function DELETE(_req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const deleted = await deleteOutfit(userId, id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    throw err
  }
}
