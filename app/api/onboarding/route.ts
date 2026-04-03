// /Users/Shared/Program/nextjs/quiz-app/app/api/onboarding/route.ts
// Title: Onboarding API
// Purpose: Saves first-time user information (birthday, etc.) to Prisma.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import {
  ensureLocalUser,
  getPrimaryEmailFromClerkUser,
} from '@/lib/clerk-sync';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      name?: string;
      birthDate?: string;
      preferredCategories?: string[];
    };
    const { name, birthDate, preferredCategories } = body;

    if (!birthDate) {
      return NextResponse.json({ error: 'Birth date is required' }, { status: 400 });
    }

    const localUser = await ensureLocalUser(clerkId, prisma);
    const email = getPrimaryEmailFromClerkUser(user);

    // ユーザー情報を保存（upsertを使用して新規・既存両方に対応）
    const updatedUser = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email: email || localUser.email,
        name,
        birthDate: new Date(birthDate),
        preferredCategories,
      },
      create: {
        clerkId,
        email: email || localUser.email,
        name,
        birthDate: new Date(birthDate),
        preferredCategories,
        role: localUser.role,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function isClerkNotFound(error: unknown) {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message || '');
  return status === 404 || message.includes('404') || message.toLowerCase().includes('not found');
}

export async function DELETE() {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    try {
      await client.users.deleteUser(clerkId);
    } catch (error) {
      if (!isClerkNotFound(error)) {
        throw error;
      }
    }

    await prisma.user.deleteMany({
      where: { clerkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
