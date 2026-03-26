// Path: app/api/webhooks/clerk/route.ts
// Title: Clerk Webhook Handler
// Purpose: Syncs Clerk user data with Prisma database upon creation, update, or deletion.

import { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { extractRoleFromMetadata, resolveUserRole } from '@/lib/authz';
import { getPrimaryEmailFromWebhookUser } from '@/lib/clerk-sync';

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
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
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      public_metadata,
      private_metadata,
      unsafe_metadata,
    } = evt.data;
    const primaryEmail = getPrimaryEmailFromWebhookUser({
      primary_email_address_id: evt.data.primary_email_address_id,
      email_addresses,
    });

    if (primaryEmail && clerkId) {
      const name = [first_name, last_name].filter(Boolean).join(' ') || undefined;
      const existingByClerkId = await prisma.user.findUnique({
        where: { clerkId },
        select: { role: true },
      });
      const existingByEmail = await prisma.user.findUnique({
        where: { email: primaryEmail },
        select: { id: true, clerkId: true, role: true },
      });
      const metadataRole = extractRoleFromMetadata(
        (public_metadata as Record<string, unknown> | undefined)?.role,
        (private_metadata as Record<string, unknown> | undefined)?.role
      );
      const role = resolveUserRole({
        email: primaryEmail,
        existingRole: existingByClerkId?.role || existingByEmail?.role,
        metadataRole,
      });

      if (existingByEmail && existingByEmail.clerkId !== clerkId) {
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId,
            email: primaryEmail,
            name,
            role,
          },
        });
      } else {
        await prisma.user.upsert({
          where: { clerkId },
          update: {
            email: primaryEmail,
            name,
            role,
          },
          create: {
            clerkId,
            email: primaryEmail,
            name,
            role,
          },
        });
      }
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
