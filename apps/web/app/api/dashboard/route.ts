import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDashboardStats } from '@/lib/wears'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'

/** The web dashboard reads this directly on the server; this is for mobile. */
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
    return NextResponse.json(await getDashboardStats(scope.wardrobeId, userId))
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
