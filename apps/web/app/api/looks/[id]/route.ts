import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getLook, updateLook, deleteLook } from '@/lib/wardrobe-db'
import { trashFile } from '@/lib/google-drive'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { LookUpdateSchema } from '@wardrobe-whimsy/api-client'

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
    const look = await getLook(scope.wardrobeId, userId, id)
    if (!look) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(look)
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
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

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = LookUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  try {
    const updated = await updateLook(scope.wardrobeId, userId, id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
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
    const { fileToDelete, deleted } = await deleteLook(scope.wardrobeId, userId, id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Binned, not deleted, so a mistaken delete can be undone from Drive's
    // bin. The DB row is already gone; a failed move only orphans a file, so
    // trashFile swallows its own errors rather than failing the request.
    if (fileToDelete) await trashFile(scope.wardrobeId, fileToDelete)

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
