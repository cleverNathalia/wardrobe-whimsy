import { NextResponse } from 'next/server'
import { generateUploadSignature, HAS_CLOUDINARY } from '@/lib/cloudinary'
import { requireUser } from '@/lib/auth'

export async function POST() {
  if (!HAS_CLOUDINARY) {
    return NextResponse.json(
      { error: 'Image upload is unavailable — Cloudinary keys are not configured.' },
      { status: 503 },
    )
  }

  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = generateUploadSignature()
  return NextResponse.json(result)
}
