// Path: app/api/user/status/route.ts
// Title: User Status API
// Purpose: Returns the current user's role, level, and XP for client-side synchronization.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureLocalUser } from '@/lib/clerk-sync';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // DBに同期されているか確認しつつUserを取得
    const user = await ensureLocalUser(clerkId, prisma);

    return NextResponse.json({
      role: user.role,
      level: user.level,
      xp: user.xp,
    });
  } catch (error) {
    console.error('User status API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
