/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/usage/route.ts
// Title: API Usage Dashboard API
// Purpose: Returns current month's usage statistics and spending vs budget.

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkApiBudget } from '@/lib/ai-usage';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    
    // Auth Check
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const budgetStatus = await checkApiBudget(prisma);
    
    // Detailed usage by model
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const usageByModel = await (prisma as any).apiUsage.groupBy({
      by: ['modelId'],
      where: {
        timestamp: {
          gte: firstDayOfMonth
        }
      },
      _sum: {
        estimatedCost: true,
        totalTokens: true
      },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      budget: budgetStatus,
      usageByModel: usageByModel.map((m: any) => ({
        modelId: m.modelId,
        cost: m._sum.estimatedCost || 0,
        tokens: m._sum.totalTokens || 0,
        requests: m._count.id
      }))
    });

  } catch (error: unknown) {
    console.error('Usage API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
