/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureQuizTranslationExplanationColumn } from '@/lib/quiz-translation-explanation';
import { buildDefaultOverlayVisualData, ensureQuizTranslationVisualColumns, serializeQuizVisualData } from '@/lib/quiz-translation-visual';

const SUPPORTED_LOCALES = ['ja', 'en', 'zh'] as const;

function normalizeTranslations(translations: Record<string, any>) {
  const normalized: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const data = translations?.[locale];
    if (!data) continue;
    const visualMode = data.visualMode === 'overlay' ? 'overlay' : 'generated';
    const visualData = visualMode === 'overlay'
      ? (data.visualData || buildDefaultOverlayVisualData(data.title || '無題'))
      : null;

    normalized[locale] = {
      title: data.title || '',
      question: data.question || '',
      hint: data.hint || '',
      answer: data.answer || '',
      explanation: data.explanation || null,
      type: data.type || 'TEXT',
      options: data.type === 'CHOICE' ? data.options : null,
      imageUrl: data.imageUrl || null,
      visualMode,
      visualData,
    };
  }
  return normalized;
}

// 権限チェックのヘルパー
async function isAdminOrParent(prisma: PrismaClient) {
  const { userId } = await auth();
  if (!userId) {
    console.error('isAdminOrParent: No userId found in auth()');
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (!user) {
    console.error(`isAdminOrParent: User not found in DB for clerkId: ${userId}`);
    return false;
  }

  const authorized = user.role === 'ADMIN' || user.role === 'PARENT';
  if (!authorized) {
    console.warn(`isAdminOrParent: User ${userId} has insufficient role: ${user.role}`);
  }

  return authorized;
}

export async function GET(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rawQuizzes = await prisma.quiz.findMany({
      include: {
        translations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const quizzes = rawQuizzes.map((q: any) => {
      const translationsMap: any = {};
      const jaT = q.translations.find((t: any) => t.locale === 'ja') || {
        title: 'No Title', question: '', hint: '', answer: '', explanation: null, type: 'TEXT', options: null, imageUrl: null
      };

      ['ja', 'en', 'zh'].forEach(loc => {
        const t = q.translations.find((trans: any) => trans.locale === loc);
        translationsMap[loc] = {
          title: t?.title || jaT.title,
          question: t?.question || jaT.question,
          hint: t?.hint || jaT.hint,
          answer: t?.answer || jaT.answer,
          explanation: t?.explanation || jaT.explanation || null,
          type: (t?.type || jaT.type) as 'CHOICE' | 'TEXT',
          options: t?.options ?? jaT.options,
          imageUrl: t?.imageUrl || null,
        };
      });

      return {
        id: q.id,
        title: jaT.title,
        type: jaT.type,
        question: jaT.question,
        hint: jaT.hint,
        answer: jaT.answer,
        explanation: jaT.explanation || null,
        options: jaT.options,
        imageUrl: q.imageUrl,
        category: q.categoryId,
        targetAge: q.targetAge,
        createdAt: q.createdAt.toISOString(),
        translations: translationsMap,
      };
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Admin Quiz GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureQuizTranslationExplanationColumn(prisma as any);
    await ensureQuizTranslationVisualColumns(prisma as any);
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await req.json()) as any;
    const { categoryId, targetAge, imageUrl, translations } = body;
    const normalizedTranslations = normalizeTranslations(translations || {});

    if (!categoryId || !normalizedTranslations.ja) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // クイズを手動作成 (複数言語対応)
    const newQuiz = await prisma.quiz.create({
      data: {
        categoryId,
        targetAge: Number(targetAge) || 6,
        imageUrl: imageUrl || '',
      },
    });

    for (const [locale, data] of Object.entries(normalizedTranslations) as [string, any][]) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "QuizTranslation" ("id", "quizId", "locale", "title", "question", "hint", "answer", "explanation", "type", "options", "imageUrl", "visualMode", "visualData") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        crypto.randomUUID(),
        newQuiz.id,
        locale,
        data.title,
        data.question,
        data.hint,
        data.answer,
        data.explanation,
        data.type,
        data.options ? JSON.stringify(data.options) : null,
        data.imageUrl,
        data.visualMode,
        serializeQuizVisualData(data.visualData)
      );
    }

    return NextResponse.json({ success: true, quiz: newQuiz });
  } catch (error) {
    console.error('Admin Quiz Create Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureQuizTranslationExplanationColumn(prisma as any);
    await ensureQuizTranslationVisualColumns(prisma as any);
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await req.json()) as any;
    const { id, categoryId, targetAge, imageUrl, translations } = body;
    const normalizedTranslations = normalizeTranslations(translations || {});

    if (!id || !categoryId || !normalizedTranslations.ja) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // クイズの基本情報を更新
    await prisma.quiz.update({
      where: { id },
      data: {
        categoryId,
        targetAge: Number(targetAge) || 6,
        imageUrl: imageUrl || '',
      },
    });

    // 各翻訳を順次upsert (SQLiteのロック問題を避けるため)
    for (const [locale, data] of Object.entries(normalizedTranslations) as [string, any][]) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "QuizTranslation" ("id", "quizId", "locale", "title", "question", "hint", "answer", "explanation", "type", "options", "imageUrl", "visualMode", "visualData") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT("quizId", "locale") DO UPDATE SET "title" = excluded."title", "question" = excluded."question", "hint" = excluded."hint", "answer" = excluded."answer", "explanation" = excluded."explanation", "type" = excluded."type", "options" = excluded."options", "imageUrl" = excluded."imageUrl", "visualMode" = excluded."visualMode", "visualData" = excluded."visualData"',
        crypto.randomUUID(),
        id,
        locale,
        data.title,
        data.question,
        data.hint,
        data.answer,
        data.explanation,
        data.type,
        data.options ? JSON.stringify(data.options) : null,
        data.imageUrl,
        data.visualMode,
        serializeQuizVisualData(data.visualData)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Quiz Update Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { target } = (await req.json()) as { target: string };
    if (!target) {
        return NextResponse.json({ error: 'Missing target ID' }, { status: 400 });
    }

    await prisma.quiz.delete({
      where: { id: target },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Quiz Delete Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
