import { NextResponse } from 'next/server'
import { WardrobeNotFoundError, FolderNotConnectedError } from './google-drive'
import { GoogleNotConnectedError, isInvalidGrantError } from './google-oauth'
import { ItemsNotFoundError } from './wardrobe-db'

/**
 * Maps the domain errors thrown by the wardrobe and Drive layers onto HTTP
 * responses. Returns null for anything unrecognised, so callers rethrow and let
 * it surface as a 500 rather than being silently swallowed.
 *
 * The two 409s are distinct on purpose: GOOGLE_NOT_CONNECTED means the user
 * must run the OAuth flow, FOLDER_NOT_CONNECTED means they are authorised but
 * this wardrobe has no folder yet.
 */
export function domainErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof WardrobeNotFoundError) {
    return NextResponse.json({ error: 'Wardrobe not found or access denied' }, { status: 404 })
  }

  // An expired or revoked refresh token is indistinguishable from never having
  // connected, as far as the user needs to care — both are fixed by reconnecting.
  if (err instanceof GoogleNotConnectedError || isInvalidGrantError(err)) {
    return NextResponse.json(
      { error: 'Google account not connected', code: 'GOOGLE_NOT_CONNECTED' },
      { status: 409 },
    )
  }

  if (err instanceof FolderNotConnectedError) {
    return NextResponse.json(
      { error: 'Google Drive folder not connected', code: 'FOLDER_NOT_CONNECTED' },
      { status: 409 },
    )
  }

  if (err instanceof ItemsNotFoundError) {
    return NextResponse.json({ error: 'One or more items not found' }, { status: 404 })
  }

  return null
}

/** Every wardrobe-scoped endpoint takes ?wardrobeId=… — this is the shared read + 400. */
export function readWardrobeId(req: Request): { wardrobeId: string } | { response: NextResponse } {
  const wardrobeId = new URL(req.url).searchParams.get('wardrobeId')

  if (!wardrobeId) {
    return {
      response: NextResponse.json({ error: 'wardrobeId query param is required' }, { status: 400 }),
    }
  }

  return { wardrobeId }
}
