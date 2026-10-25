import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { setOutfitColourCombos } from '@/lib/colour-combos'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { OutfitColourCombosUpdateSchema } from '@wardrobe-whimsy/api-client'

type RouteContext = { params: Promise<{ id: string }> }

/** Replaces which colour combos this outfit belongs to — the link edited from the outfit's side. */
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

  const parsed = OutfitColourCombosUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { id } = await params
  try {
    await setOutfitColourCombos(scope.wardrobeId, userId, id, parsed.data.comboIds)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
