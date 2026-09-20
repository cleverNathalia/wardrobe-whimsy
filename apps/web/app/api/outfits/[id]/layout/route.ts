import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { updateOutfitLayout } from '@/lib/wardrobe-db'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { OutfitLayoutUpdateSchema } from '@wardrobe-whimsy/api-client'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Saves a collage arrangement. Kept apart from PATCH /api/outfits/[id] so that
 * moving items and changing which items are in the outfit can never overwrite
 * one another.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = OutfitLayoutUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  try {
    const updated = await updateOutfitLayout(scope.wardrobeId, userId, id, parsed.data.items)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
