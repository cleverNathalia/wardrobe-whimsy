import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { pollPickerSession } from '@/lib/google-photos'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const { searchParams } = new URL(req.url)
  const accessToken = searchParams.get('accessToken')

  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken query param is required' }, { status: 400 })
  }

  try {
    const session = await pollPickerSession(sessionId, accessToken)
    const expired = new Date(session.expireTime) < new Date()
    return NextResponse.json({ mediaItemsSet: session.mediaItemsSet, expired })
  } catch (err) {
    console.error('[google-photos/session/poll]', err)
    return NextResponse.json({ error: 'Failed to poll session' }, { status: 502 })
  }
}
