// Path: app/api/webhooks/clerk/route.ts
export const runtime = 'edge';
// Title: Clerk Webhook Handler
// Purpose: Syncs Clerk user data with Prisma database upon creation, update, or deletion.

import { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification error', {
      status: 400,
    });
  }

  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id: clerkId, email_addresses, first_name, last_name } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (primaryEmail && clerkId) {
      const name = [first_name, last_name].filter(Boolean).join(' ') || undefined;

      await prisma.user.upsert({
        where: { clerkId },
        update: {
          email: primaryEmail,
          name,
        },
        create: {
          clerkId,
          email: primaryEmail,
          name,
          role: 'CHILD', // デフォルトは子供として扱う
        },
      });
      console.log(`Synced user ${clerkId} to Prisma`);
    }
  } else if (eventType === 'user.deleted') {
    const { id: clerkId } = evt.data;
    if (clerkId) {
      await prisma.user.deleteMany({
        where: { clerkId },
      });
      console.log(`Deleted user ${clerkId} from Prisma`);
    }
  }

  return new Response('Webhook received', { status: 200 });
}
