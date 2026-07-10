import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    email_addresses: { email_address: string; id: string }[]
    primary_email_address_id: string
    first_name: string | null
    last_name: string | null
    image_url: string | null
  }
}

type ClerkUserDeletedEvent = {
  type: 'user.deleted'
  data: {
    id: string
    deleted: boolean
  }
}

type ClerkWebhookEvent = ClerkUserCreatedEvent | ClerkUserDeletedEvent

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
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = event.data
    const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id)?.email_address

    if (!primaryEmail) {
      return NextResponse.json({ error: 'No primary email found' }, { status: 400 })
    }

    const name = [first_name, last_name].filter(Boolean).join(' ') || null

    await prisma.user.upsert({
      where: { clerkId: id },
      create: { clerkId: id, email: primaryEmail, name, image: image_url },
      update: { email: primaryEmail, name, image: image_url },
    })
  }

  if (event.type === 'user.deleted') {
    await prisma.user.deleteMany({ where: { clerkId: event.data.id } })
  }

  return NextResponse.json({ received: true })
}
