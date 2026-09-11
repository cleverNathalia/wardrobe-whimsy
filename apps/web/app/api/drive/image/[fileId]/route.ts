import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getImageBuffer, validateWardrobeAccess } from '@/lib/google-drive'
import { domainErrorResponse } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ fileId: string }> }

/**
 * Resolves which wardrobe a Drive file belongs to from the file id alone.
 *
 * The caller does not supply a wardrobeId: it would be an unverified claim, and
 * a query string would break next/image, which matches `localPatterns.search`
 * exactly and cannot wildcard a varying value.
 */
async function findOwningWardrobeId(fileId: string): Promise<string | null> {
  const item = await prisma.clothingItem.findFirst({
    where: { imageFileId: fileId },
    select: { wardrobeId: true },
  })
  if (item) return item.wardrobeId

  // Outfit covers reuse a clothing item's file id, but check anyway so a cover
  // whose item was deleted still renders.
  const outfit = await prisma.outfit.findFirst({
    where: { coverImageFileId: fileId },
    select: { wardrobeId: true },
  })

  return outfit?.wardrobeId ?? null
}

export async function GET(_req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileId } = await params

  try {
    const wardrobeId = await findOwningWardrobeId(fileId)
    if (!wardrobeId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Throws WardrobeNotFoundError unless this user owns the wardrobe, so an
    // unknown file id and someone else's file are indistinguishable from outside.
    await validateWardrobeAccess(wardrobeId, userId)

    const { buffer, mimeType } = await getImageBuffer(wardrobeId, fileId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    const res = domainErrorResponse(err)
    if (res) return res

    console.error('[drive/image]', err)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 502 })
  }
}
