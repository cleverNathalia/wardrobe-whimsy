import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { setTripItem } from '@/lib/trips'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { TripItemUpdateSchema } from '@wardrobe-whimsy/api-client'

type RouteContext = { params: Promise<{ id: string; itemId: string }> }

/**
 * One item's state on a trip's list: `isLoose` adds it on its own or takes it
 * off again, `packed` ticks it. Fields left out are left alone.
 */
export async function PUT(req: Request, { params }: RouteContext) {
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

  const parsed = TripItemUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { id, itemId } = await params
  try {
    await setTripItem(scope.wardrobeId, userId, id, itemId, parsed.data)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
