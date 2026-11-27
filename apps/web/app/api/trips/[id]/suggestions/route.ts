import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getTripOutfitSuggestions } from '@/lib/suggestions/get-suggestions'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * New outfits from the items a trip is already packing, leaving out pairings
 * its outfits have. POST, like /api/suggestions: the same request can return
 * different outfits each time.
 */
export async function POST(req: Request, { params }: RouteContext) {
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
    const suggestions = await getTripOutfitSuggestions(scope.wardrobeId, userId, id)
    return NextResponse.json({ suggestions })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
