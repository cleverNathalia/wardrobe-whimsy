import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { FolderNotConnectedError, WardrobeNotFoundError, validateWardrobeAccess } from '@/lib/google-drive'
import { resizeAndUploadImage } from '@/lib/image-upload'

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
    // Validate user has access to this wardrobe
    await validateWardrobeAccess(wardrobeId, userId)

    const result = await resizeAndUploadImage(wardrobeId, originalBuffer)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof WardrobeNotFoundError) {
      return NextResponse.json({ error: 'Wardrobe not found or access denied' }, { status: 404 })
    }
    if (err instanceof FolderNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive folder not connected', code: 'FOLDER_NOT_CONNECTED' }, { status: 409 })
    }
    console.error('[drive/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }
}
