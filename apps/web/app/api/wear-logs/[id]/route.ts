import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { deleteWearLog } from '@/lib/wardrobe-db'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

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
    const deleted = await deleteWearLog(scope.wardrobeId, userId, id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
