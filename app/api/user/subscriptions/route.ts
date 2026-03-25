// Path: app/api/user/subscriptions/route.ts
// Title: Subscription API Route
// Purpose: Toggle subscription status for a channel.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureLocalUser } from '@/lib/clerk-sync';

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as { channelId: string };
    const { channelId } = body;
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    const user = await ensureLocalUser(clerkId, prisma);

    const existingSub = await prisma.subscription.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: channelId
        }
      }
    });

    if (existingSub) {
      // Unsubscribe
      await prisma.subscription.delete({
        where: { id: existingSub.id }
      });
      return NextResponse.json({ subscribed: false });
    } else {
      // Subscribe
      await prisma.subscription.create({
        data: {
          userId: user.id,
          channelId: channelId
        }
      });
      return NextResponse.json({ subscribed: true });
    }
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
