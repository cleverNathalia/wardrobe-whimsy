import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { validateWardrobeAccess, getDriveClientForWardrobe } from '@/lib/google-drive'
import { prisma } from '@/lib/prisma'
import { getServiceAccountDriveClient } from '@/lib/google-drive-service-account'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: wardrobeId } = await params

  let body: { googleFolderId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { googleFolderId } = body
  if (!googleFolderId) {
    return NextResponse.json({ error: 'googleFolderId is required' }, { status: 400 })
  }

  try {
    // Verify user owns this wardrobe
    const wardrobe = await prisma.wardrobe.findUnique({
      where: { id: wardrobeId },
    })

    if (!wardrobe || wardrobe.userId !== userId) {
      return NextResponse.json({ error: 'Wardrobe not found or access denied' }, { status: 404 })
    }

    // Test that service account can access this folder
    const drive = getServiceAccountDriveClient()
    try {
      await drive.files.list({
        q: `'${googleFolderId}' in parents`,
        spaces: 'drive',
        fields: 'files(id)',
        pageSize: 1,
      })
    } catch (err) {
      return NextResponse.json(
        { error: 'Cannot access folder. Make sure you shared it with the service account.' },
        { status: 403 }
      )
    }

    // Update wardrobe with folder ID
    await prisma.wardrobe.update({
      where: { id: wardrobeId },
      data: { googleFolderId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[wardrobes/connect]', err)
    return NextResponse.json({ error: 'Failed to connect folder' }, { status: 502 })
  }
}
