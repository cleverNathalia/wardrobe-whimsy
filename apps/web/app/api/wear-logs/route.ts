import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { listWearLogs, createWearLog } from '@/lib/wardrobe-db'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { WearLogCreateSchema } from '@wardrobe-whimsy/api-client'

/** `?outfitId=` narrows the list to one outfit's history. */
export async function GET(req: Request) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response

  const outfitId = new URL(req.url).searchParams.get('outfitId') ?? undefined

  try {
    const wearLogs = await listWearLogs(scope.wardrobeId, userId, outfitId)
    return NextResponse.json(wearLogs)
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

  const parsed = WearLogCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const wardrobeId = (body as { wardrobeId?: string }).wardrobeId
  if (!wardrobeId) {
    return NextResponse.json({ error: 'wardrobeId is required in request body' }, { status: 400 })
  }

  try {
    const wearLog = await createWearLog(wardrobeId, userId, parsed.data)
    return NextResponse.json(wearLog, { status: 201 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
