import { NextResponse } from 'next/server'
import { requireDefaultWardrobe } from '@/lib/current-wardrobe'
import { domainErrorResponse } from '@/lib/api-errors'

/**
 * The signed-in user's wardrobe. The web pages work this out on the server;
 * the mobile app has no server of its own, so it asks here first and passes
 * the id to every other wardrobe-scoped route.
 *
 * Like the web pages, this creates the user row and wardrobe on first visit.
 */
export async function GET() {
  try {
    const { wardrobeId, googleFolderId } = await requireDefaultWardrobe()
    return NextResponse.json({ wardrobeId, driveFolderConnected: googleFolderId !== null })
  } catch (err) {
    // requireUser throws a bare Response when there is no session.
    if (err instanceof Response) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const res = domainErrorResponse(err)
    if (res) return res
    throw err
  }
}
