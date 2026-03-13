import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

async function isAdminOrParent() {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });
  return user && (user.role === 'ADMIN' || user.role === 'PARENT');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isAuthorized = await isAdminOrParent();
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
