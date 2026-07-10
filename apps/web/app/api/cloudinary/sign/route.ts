import { NextResponse } from 'next/server'
import { generateUploadSignature } from '@/lib/cloudinary'
import { requireUser } from '@/lib/auth'

export async function POST() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = generateUploadSignature()
  return NextResponse.json(result)
}
