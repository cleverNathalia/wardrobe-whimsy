import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createPickerSession } from '@/lib/google-photos'

export async function POST(req: Request) {
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

  const accessToken = (body as Record<string, unknown>)?.accessToken
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
  }

  try {
    const session = await createPickerSession(accessToken)
    return NextResponse.json({ sessionId: session.id, pickerUri: session.pickerUri })
  } catch (err) {
    console.error('[google-photos/session]', err)
    return NextResponse.json({ error: 'Failed to create Google Photos session' }, { status: 502 })
  }
}
