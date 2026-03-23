/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureQuizTranslationExplanationColumn } from '@/lib/quiz-translation-explanation';
import { ensureQuizTranslationVisualColumns, parseQuizVisualData } from '@/lib/quiz-translation-visual';

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
    await ensureQuizTranslationExplanationColumn(prisma as any);
    await ensureQuizTranslationVisualColumns(prisma as any);
    const { id } = await context.params;
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const translations = await prisma.$queryRawUnsafe<Array<{
      id: string;
      quizId: string;
      locale: string;
      title: string;
      question: string;
      hint: string;
      answer: string;
      explanation: string | null;
      type: string;
      options: unknown;
      imageUrl: string | null;
      visualMode: string | null;
      visualData: string | null;
    }>>(
      'SELECT "id", "quizId", "locale", "title", "question", "hint", "answer", "explanation", "type", "options", "imageUrl", "visualMode", "visualData" FROM "QuizTranslation" WHERE "quizId" = ?',
      id
    );

    const translationsMap = Object.fromEntries(
      translations.map((t) => [
        t.locale,
        {
          ...t,
          visualData: parseQuizVisualData(t.visualData),
        },
      ])
    );

    return NextResponse.json({
      ...quiz,
      translations: translationsMap,
    });
  } catch (error) {
    console.error('Admin Quiz Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
