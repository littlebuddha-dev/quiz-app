/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

export const runtime = 'edge';

// 管理者権限チェック
async function checkAdmin(prisma: PrismaClient) {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });
  return user?.role === 'ADMIN' || user?.role === 'PARENT';
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureCategoryLocalizationColumns(prisma as any);
    const { updates } = (await request.json()) as { updates: { id: string, sortOrder: number }[] };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: '更新データが不正です。' }, { status: 400 });
    }

    // トランザクション的に更新 (executeRawUnsafeをループで回す)
    for (const update of updates) {
      await prisma.$executeRawUnsafe(
        'UPDATE "Category" SET "sortOrder" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?',
        update.sortOrder,
        update.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Category Reorder POST Error:', error);
    return NextResponse.json({ error: 'REORDER_FAILED', message: error.message }, { status: 500 });
  }
}
