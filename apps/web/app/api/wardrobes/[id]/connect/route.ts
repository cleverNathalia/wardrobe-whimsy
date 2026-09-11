import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/auth'
import { ensureWardrobeFolder, WardrobeNotFoundError } from '@/lib/google-drive'
import { GoogleNotConnectedError } from '@/lib/google-oauth'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Creates this wardrobe's folder in the signed-in user's Drive (idempotent —
 * returns the existing id if already connected). Requires the user to have
 * completed the Google OAuth flow first.
 */
export async function POST(_req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = await ensureDbUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: wardrobeId } = await params

  try {
    const googleFolderId = await ensureWardrobeFolder(wardrobeId, userId)
    return NextResponse.json({ googleFolderId }, { status: 200 })
  } catch (err) {
    if (err instanceof WardrobeNotFoundError) {
      return NextResponse.json({ error: 'Wardrobe not found or access denied' }, { status: 404 })
    }
    if (err instanceof GoogleNotConnectedError) {
      return NextResponse.json(
        { error: 'Google account not connected', code: 'GOOGLE_NOT_CONNECTED' },
        { status: 409 },
      )
    }
    console.error('[wardrobes/connect]', err)
    return NextResponse.json({ error: 'Could not create the Drive folder' }, { status: 502 })
  }
}
