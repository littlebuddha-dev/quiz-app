import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);

    // 権限チェック
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // キャッシュをクリア (Next.js Data Cache / Router Cache)
    // '/' を含むすべてのルートを再検証対象にする
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, message: 'キャッシュをクリアしました。' });
  } catch (error: any) {
    console.error('Cache Clear Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
