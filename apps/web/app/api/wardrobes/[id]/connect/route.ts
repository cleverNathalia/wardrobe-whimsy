import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/auth'
import { ensureWardrobeFolder } from '@/lib/google-drive'
import { domainErrorResponse } from '@/lib/api-errors'

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
    // Shared with every other Drive route, so a rejected login here sends the
    // connect screen back through Google instead of failing with a 502.
    const res = domainErrorResponse(err)
    if (res) return res

    console.error('[wardrobes/connect]', err)
    return NextResponse.json({ error: 'Could not create the Drive folder' }, { status: 502 })
  }
}
