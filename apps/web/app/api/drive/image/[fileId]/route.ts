import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getImageBuffer, validateWardrobeAccess } from '@/lib/google-drive'
import { domainErrorResponse, readWardrobeId } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ fileId: string }> }

export async function GET(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileId } = await params

  const scope = readWardrobeId(req)
  if ('response' in scope) return scope.response
  const { wardrobeId } = scope

  try {
    // Validate user owns this wardrobe
    await validateWardrobeAccess(wardrobeId, userId)

    // Verify the file belongs to this wardrobe
    const inWardrobe = await prisma.clothingItem.findFirst({
      where: {
        wardrobeId,
        imageFileId: fileId,
      },
    })

    if (!inWardrobe) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

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
