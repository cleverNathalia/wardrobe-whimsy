import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getOutfit, setOutfitPicture } from '@/lib/wardrobe-db'
import { deleteFile, ensureWardrobeFolder } from '@/lib/google-drive'
import { resizeAndUploadImage } from '@/lib/image-upload'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'

export const runtime = 'nodejs'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

type RouteContext = { params: Promise<{ id: string }> }

/** Readable in the user's Drive, where these pictures are meant to be browsed. */
function pictureName(outfitName: string): string {
  const name = outfitName.replace(/\s+/g, ' ').trim().slice(0, 100)
  return `Outfit - ${name || 'Untitled'}`
}

/**
 * Saves a picture of the outfit's collage to the wardrobe's Drive folder and
 * makes it the outfit's cover, deleting the picture it replaces.
 *
 * The collage is rendered in the browser and posted here: drawing it needs the
 * item photos laid out exactly as the editor draws them, and that code is
 * client-side. The app itself still draws outfit thumbnails live — this
 * picture exists so outfits can be browsed in Drive.
 */
export async function POST(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response
  const { wardrobeId } = scope
  const { id } = await params

  let file: FormDataEntryValue | null
  try {
    file = (await req.formData()).get('file')
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  try {
    const outfit = await getOutfit(wardrobeId, userId, id)
    if (!outfit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await ensureWardrobeFolder(wardrobeId, userId)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { imageFileId } = await resizeAndUploadImage(wardrobeId, buffer, pictureName(outfit.name))

    const { fileToDelete, updated } = await setOutfitPicture(wardrobeId, userId, id, imageFileId)
    if (!updated) {
      // Deleted while the picture was uploading — nothing will ever show it.
      await deleteFile(wardrobeId, imageFileId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Swallows its own errors: a picture left behind is only clutter, and the
    // orphan sweep bins it later.
    if (fileToDelete) await deleteFile(wardrobeId, fileToDelete)

    return NextResponse.json({ coverImageFileId: imageFileId })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res

    console.error('[outfits/picture]', err)
    return NextResponse.json({ error: 'Could not save the outfit picture' }, { status: 502 })
  }
}
