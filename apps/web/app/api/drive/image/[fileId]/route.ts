import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getDriveClient, readIndex, getImageBuffer, DriveNotConnectedError } from '@/lib/google-drive'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ fileId: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  let clerkUserId: string
  try {
    clerkUserId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileId } = await params

  try {
    const drive = await getDriveClient(clerkUserId)
    const { index } = await readIndex(drive)

    const owned =
      index.clothingItems.some((i) => i.imageFileId === fileId) ||
      index.outfits.some((o) => o.coverImageFileId === fileId)
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { buffer, mimeType } = await getImageBuffer(drive, fileId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: 'Google Drive not connected', code: 'DRIVE_NOT_CONNECTED' }, { status: 409 })
    }
    console.error('[drive/image]', err)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 502 })
  }
}
