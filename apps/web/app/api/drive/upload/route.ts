import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ensureWardrobeFolder } from '@/lib/google-drive'
import { domainErrorResponse } from '@/lib/api-errors'
import { resizeAndUploadImage } from '@/lib/image-upload'
import { purgeOrphanedFilesQuietly } from '@/lib/drive-cleanup'

export const runtime = 'nodejs'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function POST(req: Request) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const wardrobeId = formData.get('wardrobeId') as string
  if (!wardrobeId) {
    return NextResponse.json({ error: 'wardrobeId is required' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  let originalBuffer: Buffer
  try {
    originalBuffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Could not read uploaded file' }, { status: 422 })
  }

  try {
    // Checks the caller owns this wardrobe, and creates its folder if none is
    // saved or the saved one has gone — an upload is the moment a missing
    // folder actually matters, so it repairs itself here instead of failing.
    await ensureWardrobeFolder(wardrobeId, userId)

    const result = await resizeAndUploadImage(wardrobeId, originalBuffer)

    // Uploading is the natural moment to tidy up: it is infrequent, already
    // talking to Drive, and is exactly the action that creates orphans when a
    // form gets abandoned. Awaited rather than fire-and-forget because a
    // serverless function may be frozen the instant the response is sent.
    await purgeOrphanedFilesQuietly(wardrobeId)

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res

    console.error('[drive/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }
}
