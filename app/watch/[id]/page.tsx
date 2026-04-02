/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/watch/[id]/page.tsx
// Title: Watch Page (Detail)
// Purpose: Individual page for a quiz, showing details and comments.

import { createPrisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import WatchClientWrapper from './WatchClientWrapper';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { parseQuizVisualData } from '@/lib/quiz-translation-visual';
import { getServerLocale } from '@/lib/locale-server';
import { getAbsoluteUrl, resolveMetadataImageUrl } from '@/lib/metadata';

import { Metadata } from 'next';

export const revalidate = 600; // 10分

function normalizeOptions(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (value && typeof value === 'object') {
    // Some drivers return JSON fields as objects instead of arrays
    const values = Object.values(value);
    if (values.every(v => typeof v === 'string')) {
      return values as string[];
    }
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // If it looks like a comma-separated list, try splitting
      if (value.includes(',') && !value.includes('{') && !value.includes('[')) {
        return value.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  return undefined;
}

function toPlainText(value: string | null | undefined, maxLength = 160) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
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

  const translation = quiz.translations[0] || { title: "Quiz", question: '' };
  const baseTitle = `${translation.title} | Cue`;
  const description = toPlainText(translation.question, 160) || baseTitle;
  const canonical = getAbsoluteUrl(`/watch/${id}`);
  const imageUrl =
    resolveMetadataImageUrl(translation.imageUrl || quiz.imageUrl) ||
    getAbsoluteUrl(`/api/quiz/${id}/og-image?locale=${locale}`);

  return {
    title: baseTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: baseTitle,
      description,
      type: 'article',
      url: canonical,
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: baseTitle,
      description,
      images: [imageUrl],
    },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const { id } = await params;
  const { userId: clerkId } = await auth();
  const locale = await getServerLocale();

  // 1. クイズ情報の取得
  const rawQuiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          nameJa: true,
          nameEn: true,
          nameZh: true,
        },
      },
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
  let missionProgress:
    | {
        missionQuizIds: string[];
        solvedCount: number;
        totalCount: number;
        includesCurrentQuiz: boolean;
      }
    | undefined = undefined;

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

    if (userDb) {
      const [allQuizSummaries, allHistories] = await Promise.all([
        prisma.quiz.findMany({
          select: {
            id: true,
            categoryId: true,
            targetAge: true,
          },
        }),
        prisma.quizHistory.findMany({
          where: { userId: userDb.id },
          select: {
            quizId: true,
            isCorrect: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 300,
        }),
      ]);

      const sortedHistoryEntries = [...allHistories].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const reviewSeen = new Set<string>();
      const quizAttemptMap = new Map<string, { correct: number; wrong: number }>();
      const categoryAttemptMap = new Map<string, { accuracyBase: number; wrong: number }>();
      const quizById = new Map(allQuizSummaries.map((quiz) => [quiz.id, quiz]));

      for (const history of sortedHistoryEntries) {
        const relatedQuiz = quizById.get(history.quizId);
        if (!relatedQuiz) continue;

        const quizStats = quizAttemptMap.get(history.quizId) || { correct: 0, wrong: 0 };
        quizStats.correct += history.isCorrect ? 1 : 0;
        quizStats.wrong += history.isCorrect ? 0 : 1;
        quizAttemptMap.set(history.quizId, quizStats);

        const categoryStats = categoryAttemptMap.get(relatedQuiz.categoryId) || { accuracyBase: 0, wrong: 0 };
        categoryStats.accuracyBase += history.isCorrect ? 1 : 0;
        categoryStats.wrong += history.isCorrect ? 0 : 1;
        categoryAttemptMap.set(relatedQuiz.categoryId, categoryStats);

        if (!history.isCorrect) {
          reviewSeen.add(history.quizId);
        }
      }

      const weakCategoryBoost = new Map(
        Array.from(categoryAttemptMap.entries())
          .sort((a, b) => b[1].wrong - a[1].wrong)
          .map(([categoryId], index, list) => [categoryId, (list.length - index) * 15])
      );

      const ageCenter = rawQuiz.targetAge;
      const missionQuizIds = allQuizSummaries
        .map((quiz) => {
          const attempts = quizAttemptMap.get(quiz.id);
          const wrongCount = attempts?.wrong || 0;
          const correctCount = attempts?.correct || 0;
          const weakBoost = weakCategoryBoost.get(quiz.categoryId) || 0;
          let score = weakBoost + wrongCount * 18 - correctCount * 6;

          if (!attempts) score -= 20;
          if (reviewSeen.has(quiz.id)) score += 12;
          score -= Math.abs(quiz.targetAge - ageCenter);

          return { id: quiz.id, score };
        })
        .filter((quiz) => quiz.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((quiz) => quiz.id);

      const solvedMissionSet = new Set(
        sortedHistoryEntries
          .filter((history) => history.isCorrect && missionQuizIds.includes(history.quizId))
          .map((history) => history.quizId)
      );

      missionProgress = {
        missionQuizIds,
        solvedCount: solvedMissionSet.size,
        totalCount: missionQuizIds.length,
        includesCurrentQuiz: missionQuizIds.includes(id),
      };
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
    category:
      rawQuiz.category
        ? rawQuiz.category.nameJa || rawQuiz.category.name || rawQuiz.category.id
        : rawQuiz.categoryId,
    categoryId: rawQuiz.categoryId,
    categoryInfo: rawQuiz.category
      ? {
          id: rawQuiz.category.id,
          name: rawQuiz.category.name,
          nameJa: rawQuiz.category.nameJa,
          nameEn: rawQuiz.category.nameEn,
          nameZh: rawQuiz.category.nameZh,
        }
      : null,
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

  const localizedQuiz =
    rawTranslations.find((translation) => translation.locale === locale) ||
    rawTranslations.find((translation) => translation.locale === 'ja') ||
    rawTranslations[0];
  const seoImageUrl =
    resolveMetadataImageUrl(localizedQuiz?.imageUrl || rawQuiz.imageUrl) ||
    getAbsoluteUrl(`/api/quiz/${id}/og-image?locale=${locale}`);
  const quizStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: localizedQuiz?.title || 'Cue Quiz',
    description:
      toPlainText(localizedQuiz?.question, 180) ||
      toPlainText(localizedQuiz?.explanation, 180) ||
      'Cue quiz detail page',
    inLanguage: locale,
    url: getAbsoluteUrl(`/watch/${id}`),
    image: [seoImageUrl],
    isAccessibleForFree: true,
    educationalUse: 'practice',
    learningResourceType: 'quiz',
    about: rawQuiz.category
      ? {
          '@type': 'Thing',
          name:
            (locale === 'en' ? rawQuiz.category.nameEn : locale === 'zh' ? rawQuiz.category.nameZh : rawQuiz.category.nameJa) ||
            rawQuiz.category.name,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Cue',
      url: getAbsoluteUrl('/'),
    },
  };

  return (
    <>
      <template
        data-quiz-structured-data={JSON.stringify(quizStructuredData)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizStructuredData) }}
      />
      <WatchClientWrapper
        quiz={quizData as any}
        initialComments={initialComments}
        initialBookmark={isBookmarked}
        initialLike={isLiked}
        initialCleared={isCleared}
        isLoggedIn={!!clerkId}
        relatedQuizzes={relatedQuizzes}
        userStatus={userStatus}
        missionProgress={missionProgress}
      />
    </>
  );
}
