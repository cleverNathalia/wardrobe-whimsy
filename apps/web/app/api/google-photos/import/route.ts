import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { HAS_CLOUDINARY } from '@/lib/cloudinary'
import { importFirstMediaItem } from '@/lib/google-photos'

export async function POST(req: Request) {
  if (!HAS_CLOUDINARY) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 })
  }

  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sessionId, accessToken } = (body as Record<string, unknown>) ?? {}
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
  }

  try {
    const result = await importFirstMediaItem(sessionId, accessToken)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[google-photos/import]', message)
    if (message.includes('No media items')) {
      return NextResponse.json({ error: 'No photo was selected' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to import photo' }, { status: 502 })
  }
}
