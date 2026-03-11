// Path: app/api/user/subscriptions/route.ts
// Title: Subscription API Route
// Purpose: Toggle subscription status for a channel.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await req.json();
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
