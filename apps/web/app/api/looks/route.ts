import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { listLooks, createLook } from '@/lib/wardrobe-db'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { LookCreateSchema } from '@wardrobe-whimsy/api-client'

export async function GET(req: Request) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  try {
    const looks = await listLooks(scope.wardrobeId, userId)
    return NextResponse.json(looks)
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
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

  const parsed = LookCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const wardrobeId = (body as { wardrobeId?: string }).wardrobeId
  if (!wardrobeId) {
    return NextResponse.json({ error: 'wardrobeId is required in request body' }, { status: 400 })
  }

  try {
    const look = await createLook(wardrobeId, userId, parsed.data)
    return NextResponse.json(look, { status: 201 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
