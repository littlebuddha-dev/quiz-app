import { NextResponse, NextRequest } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

async function isAdminOrParent(prisma: PrismaClient) {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });
  return user && (user.role === 'ADMIN' || user.role === 'PARENT');
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { id } = await context.params;
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        translations: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Admin Quiz Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
