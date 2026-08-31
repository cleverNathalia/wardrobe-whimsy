import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

type ClerkWebhookEvent = { type: string; data: Record<string, unknown> }

// Storage now lives entirely in each user's own Google Drive (see PROJECT_PLAN.md's
// 2026-07-31 architecture decision) — there is no local User table to sync anymore.
// `user.deleted` is intentionally a no-op: by the time this fires, Clerk has already
// dropped the linked Google OAuth grant, so there's no reliable token left to clean up
// Drive data with, and the data is the user's own to keep or delete themselves.
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  const payload = await req.text()

  const wh = new Webhook(secret)
  try {
    wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  return NextResponse.json({ received: true })
}
