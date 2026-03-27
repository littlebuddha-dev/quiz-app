/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/watch/[id]/page.tsx
// Title: Watch Page (Detail)
// Purpose: Individual page for a quiz, showing details and comments.

import { createPrisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import WatchClientWrapper from './WatchClientWrapper';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureQuizTranslationExplanationColumn } from '@/lib/quiz-translation-explanation';
import { ensureQuizTranslationVisualColumns, parseQuizVisualData } from '@/lib/quiz-translation-visual';
import { getSiteUrl } from '@/lib/site-config';
import { getServerLocale } from '@/lib/locale-server';

import React, { Suspense } from 'react';

import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function normalizeOptions(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const locale = await getServerLocale();

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      translations: {
        where: { locale }
      },
      category: true,
    },
  });

  if (!quiz) return { title: "Quiz Not Found" };

  const translation = quiz.translations[0] || { title: "Quiz" };
  const baseTitle = `${translation.title} | Cue`;

  return {
    title: baseTitle,
    openGraph: {
      title: baseTitle,
      images: [`/api/quiz/${id}/og-image?locale=${locale}`],
    },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  await ensureQuizTranslationExplanationColumn(prisma as any);
  await ensureQuizTranslationVisualColumns(prisma as any);
  const { id } = await params;
  const { userId: clerkId } = await auth();

  // 1. クイズ情報の取得
  const rawQuiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      channel: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { histories: true }
      }
    },
  });

  if (!rawQuiz) {
    notFound();
  }

  const rawTranslations = await prisma.quizTranslation.findMany({
    where: { quizId: id },
    select: {
      locale: true,
      title: true,
      question: true,
      hint: true,
      answer: true,
      explanation: true,
      type: true,
      options: true,
      imageUrl: true,
      visualMode: true,
      visualData: true,
    },
  });


  if (rawTranslations.length === 0) {
    notFound();
  }

  // 2. ログインユーザーの状態取得
  let isBookmarked = false;
  let isLiked = false;
  let isCleared = false;
  let userStatus: { xp: number; level: number; role: string } | undefined = undefined;

  if (clerkId) {
    const userDb = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        bookmarks: { where: { quizId: id } },
        likes: { where: { quizId: id } },
        histories: { where: { quizId: id, isCorrect: true } },
      },
    });
    if (userDb) {
      const u = userDb as any;
      userStatus = { xp: u.xp || 0, level: u.level || 1, role: u.role };
      isBookmarked = userDb.bookmarks.length > 0;
      isLiked = userDb.likes.length > 0;
      isCleared = userDb.histories.length > 0;
    }
  }

  // クライアントコンポーネント用データフォーマット (多言語対応)
  const translationsMap = Object.fromEntries(
    rawTranslations.map((t) => [
      t.locale,
      {
        title: t.title,
        question: t.question,
        hint: t.hint,
        answer: t.answer,
        explanation: t.explanation,
        type: t.type,
        options: normalizeOptions(t.options),
        imageUrl: t.imageUrl,
        visualMode: t.visualMode || 'generated',
        visualData: parseQuizVisualData(t.visualData),
      },
    ])
  );

  const quizData = {
    id: rawQuiz.id,
    categoryId: rawQuiz.categoryId,
    targetAge: rawQuiz.targetAge,
    imageUrl: rawQuiz.imageUrl,
    translations: translationsMap,
    channel: rawQuiz.channel ? { id: rawQuiz.channel.id, name: rawQuiz.channel.name, avatarUrl: rawQuiz.channel.avatarUrl } : null,
    viewCount: (rawQuiz as any)._count?.histories || 0,
  };

  // 3. 関連クイズ（レコメンド）の取得
  const rawRelated = await prisma.quiz.findMany({
    where: {
      AND: [
        { id: { not: id } }, // 現在表示中のクイズ以外
        {
          OR: [
            { categoryId: rawQuiz.categoryId }, // 同じカテゴリ
            { targetAge: { gte: rawQuiz.targetAge - 1, lte: rawQuiz.targetAge + 1 } }, // 近い学年
          ],
        },
      ],
    },
    take: 6,
    include: {
      translations: true,
      _count: {
        select: { histories: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  const relatedQuizzes = rawRelated.map((q: any) => {
    const jaTranslation = q.translations.find((t: any) => t.locale === 'ja') || q.translations[0];
    const translations = Object.fromEntries(
      q.translations.map((t: any) => [
        t.locale,
        {
          title: t.title,
          imageUrl: t.imageUrl,
          options: normalizeOptions(t.options),
        },
      ])
    );

    return {
      id: q.id,
      title: jaTranslation?.title || '無題',
      imageUrl: q.imageUrl,
      targetAge: q.targetAge,
      translations,
      viewCount: q._count?.histories || 0,
    };
  });

  const initialComments = rawQuiz.comments.map((c) => ({
    id: c.id,
    content: c.content,
    userName: c.user.name || 'ゲスト',
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <WatchClientWrapper 
      quiz={quizData as any} 
      initialComments={initialComments}
      initialBookmark={isBookmarked}
      initialLike={isLiked}
      initialCleared={isCleared}
      isLoggedIn={!!clerkId}
      relatedQuizzes={relatedQuizzes}
      userStatus={userStatus}
    />
  );
}
