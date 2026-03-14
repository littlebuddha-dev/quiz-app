// /Users/Shared/Program/nextjs/quiz-app/app/api/onboarding/route.ts
// Title: Onboarding API
// Purpose: Saves first-time user information (birthday, etc.) to Prisma.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as any;
    const { name, birthDate, preferredCategories } = body;

    if (!birthDate) {
      return NextResponse.json({ error: 'Birth date is required' }, { status: 400 });
    }

    const email = user.emailAddresses[0]?.emailAddress || '';

    // ユーザー情報を保存（upsertを使用して新規・既存両方に対応）
    const updatedUser = await prisma.user.upsert({
      where: { clerkId },
      update: {
        name,
        birthDate: new Date(birthDate),
        preferredCategories,
      },
      create: {
        clerkId,
        email,
        name,
        birthDate: new Date(birthDate),
        preferredCategories,
        role: 'CHILD', // デフォルト
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
