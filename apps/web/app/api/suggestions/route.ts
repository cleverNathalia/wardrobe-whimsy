import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getOutfitSuggestions } from '@/lib/suggestions/get-suggestions'
import { domainErrorResponse } from '@/lib/api-errors'
import { SuggestionRequestSchema } from '@wardrobe-whimsy/api-client'

/**
 * Suggested outfits from the wardrobe's ACTIVE items (FR-7.1). POST rather
 * than GET because suggestions are not stable — the same request can return
 * different outfits each time.
 */
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

  const parsed = SuggestionRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const wardrobeId = (body as { wardrobeId?: string }).wardrobeId
  if (!wardrobeId) {
    return NextResponse.json({ error: 'wardrobeId is required in request body' }, { status: 400 })
  }

  try {
    const suggestions = await getOutfitSuggestions(wardrobeId, userId, parsed.data)
    return NextResponse.json({ suggestions })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
