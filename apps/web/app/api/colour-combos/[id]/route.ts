import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { deleteColourCombo, getColourCombo, updateColourCombo } from '@/lib/colour-combos'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { ColourComboUpdateSchema } from '@wardrobe-whimsy/api-client'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  const { id } = await params
  try {
    const combo = await getColourCombo(scope.wardrobeId, userId, id)
    if (!combo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(combo)
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}

/** Sending `swatches` or `outfitIds` replaces that whole list. */
export async function PATCH(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ColourComboUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { id } = await params
  try {
    const combo = await updateColourCombo(scope.wardrobeId, userId, id, parsed.data)
    if (!combo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(combo)
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  const { id } = await params
  try {
    const deleted = await deleteColourCombo(scope.wardrobeId, userId, id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
