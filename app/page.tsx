/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/page.tsx
// Title: YouTube-like Main Dashboard (Server Component)
// Purpose: Fetches quiz data from the database and passes it to the client component.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { auth } from '@clerk/nextjs/server';
import QuizClientWrapper from './components/QuizClientWrapper';
import { Quiz, StudyRecommendations, WeakCategoryInsight } from './types';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

type CategoryRow = {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameZh: string | null;
  minAge: number;
  maxAge: number | null;
  icon: string | null;
};

export const dynamic = 'force-dynamic';

function getTodayLabel() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// Server Component (async)
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  await ensureCategoryLocalizationColumns(prisma as any);
  const { q: searchQuery, category: activeCategory } = await searchParams;
  const { userId: clerkId } = await auth();

  // ログイン中のユーザーがいればその設定・履歴を取得
  let userBookmarks: string[] = [];
  let userLikes: string[] = [];
  let userHistories: string[] = [];
  let userTargetAge: number | null = null;
  let userStatus: { xp: number; level: number; role: string } | undefined = undefined;
  let userHistoryEntries: Array<{ quizId: string; isCorrect: boolean; createdAt: Date }> = [];

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        bookmarks: true,
        likes: true,
        histories: true,
      },
    });

    if (user) {
      userBookmarks = user.bookmarks.map((b) => b.quizId);
      userLikes = user.likes.map((l) => l.quizId);
      userHistories = user.histories.filter((h) => h.isCorrect).map((h) => h.quizId);
      userHistoryEntries = user.histories.map((h) => ({
        quizId: h.quizId,
        isCorrect: h.isCorrect,
        createdAt: h.createdAt,
      }));
      userTargetAge = user.targetAge;
      const u = user as any;
      userStatus = { xp: u.xp, level: u.level, role: u.role }; // Assign userStatus here
    }
  }

  // ユーザーの年齢を特定
  let effectiveAge: number | null = userTargetAge;
  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user?.birthDate) {
      const today = new Date();
      const birth = new Date(user.birthDate);
      effectiveAge = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        effectiveAge--;
      }
    } else if (user?.targetAge) {
      effectiveAge = user.targetAge;
    }
  }

  // カテゴリーを取得
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      nameJa: true,
      nameEn: true,
      nameZh: true,
      minAge: true,
      maxAge: true,
      icon: true,
    },
    orderBy: [
      { sortOrder: 'asc' },
      { minAge: 'asc' },
      { createdAt: 'asc' },
    ],
  });


  // サイドバー用のカテゴリー（表示されているすべてのジャンルを許可）
  // ただし、名前が空のものは除外する
  const displayCategoriesRaw = allCategories.filter(c => (c.nameJa || c.name) && (c.nameJa || c.name).trim() !== '');

  // クイズフィルタリング用の有効なカテゴリーID
  const filteredCategories = effectiveAge === null
    ? allCategories
    : allCategories.filter(cat => {
        const minMatch = effectiveAge >= cat.minAge;
        const maxMatch = cat.maxAge === null || effectiveAge <= cat.maxAge;
        return minMatch && maxMatch;
      });

  const filteredCategoryIds = filteredCategories.map(c => c.id);

  // DBからクイズ一覧を取得 (表示可能なカテゴリーのみ)
  const rawQuizzes = await prisma.quiz.findMany({
    where: {
      AND: [
        { categoryId: { in: filteredCategoryIds } },
        activeCategory && activeCategory !== 'すべて'
          ? { categoryId: activeCategory }
          : {},
        searchQuery
          ? {
              translations: {
                some: {
                  OR: [
                    { title: { contains: searchQuery } },
                    { question: { contains: searchQuery } },
                  ],
                },
              },
            }
          : {},
      ],
    },
    include: {
      translations: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 年齢によるソート (サーバーサイド)
  if (effectiveAge !== null) {
    rawQuizzes.sort((a, b) => {
      const diffA = Math.abs(a.targetAge - effectiveAge);
      const diffB = Math.abs(b.targetAge - effectiveAge);
      return diffA - diffB;
    });
  }

  // Prismaの型からフロントエンド用のQuiz型へマッピング
  const quizzes: Quiz[] = rawQuizzes.map((q: any) => {
    const translationsMap: any = {};
    const jaT = q.translations.find((t: any) => t.locale === 'ja') || {
      title: '名称未設定', question: '問題文がありません', hint: '', answer: '', explanation: null, type: 'TEXT', options: null,
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
      category: q.categoryId,
      targetAge: q.targetAge,
      imageUrl: q.imageUrl,
      translations: translationsMap,
      createdAt: q.createdAt.toISOString(),
    };
  });

  const displayCategories = displayCategoriesRaw.map(c => ({
    id: c.id,
    name: c.nameJa || c.name,
    ja: c.nameJa || c.name,
    en: c.nameEn || c.nameJa || c.name,
    zh: c.nameZh || c.nameJa || c.name,
    icon: c.icon,
  }));

  const categoryLabelMap = new Map(
    displayCategories.map((category) => [category.id, category.ja || category.name || category.id])
  );

  const studyRecommendations: StudyRecommendations | undefined = clerkId
    ? (() => {
        const sortedHistoryEntries = [...userHistoryEntries].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        const quizById = new Map(rawQuizzes.map((quiz) => [quiz.id, quiz]));
        const reviewQuizIds: string[] = [];
        const seenReview = new Set<string>();
        const quizAttemptMap = new Map<string, { total: number; correct: number; wrong: number; latestCorrect: boolean }>();
        const categoryAttemptMap = new Map<string, { total: number; correct: number; wrong: number; focusQuizIds: string[] }>();

        for (const history of sortedHistoryEntries) {
          const relatedQuiz = quizById.get(history.quizId);
          if (!relatedQuiz) continue;

          const quizStats = quizAttemptMap.get(history.quizId) || {
            total: 0,
            correct: 0,
            wrong: 0,
            latestCorrect: history.isCorrect,
          };
          quizStats.total += 1;
          quizStats.correct += history.isCorrect ? 1 : 0;
          quizStats.wrong += history.isCorrect ? 0 : 1;
          if (quizStats.total === 1) {
            quizStats.latestCorrect = history.isCorrect;
          }
          quizAttemptMap.set(history.quizId, quizStats);

          const categoryStats = categoryAttemptMap.get(relatedQuiz.categoryId) || {
            total: 0,
            correct: 0,
            wrong: 0,
            focusQuizIds: [],
          };
          categoryStats.total += 1;
          categoryStats.correct += history.isCorrect ? 1 : 0;
          categoryStats.wrong += history.isCorrect ? 0 : 1;
          if (!history.isCorrect && !categoryStats.focusQuizIds.includes(history.quizId)) {
            categoryStats.focusQuizIds.push(history.quizId);
          }
          categoryAttemptMap.set(relatedQuiz.categoryId, categoryStats);

          if (!history.isCorrect && !seenReview.has(history.quizId)) {
            seenReview.add(history.quizId);
            reviewQuizIds.push(history.quizId);
          }
        }

        const weakCategories: WeakCategoryInsight[] = Array.from(categoryAttemptMap.entries())
          .filter(([, stats]) => stats.total >= 2 && stats.wrong > 0)
          .map(([categoryId, stats]) => ({
            categoryId,
            label: categoryLabelMap.get(categoryId) || categoryId,
            totalAttempts: stats.total,
            correctCount: stats.correct,
            wrongCount: stats.wrong,
            accuracy: Math.round((stats.correct / stats.total) * 100),
            focusQuizIds: stats.focusQuizIds.slice(0, 4),
          }))
          .sort((a, b) => {
            if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
            return b.totalAttempts - a.totalAttempts;
          })
          .slice(0, 3);

        const weakCategoryBoost = new Map(
          weakCategories.map((category, index) => [category.categoryId, (weakCategories.length - index) * 15])
        );

        const dailyQuizIds = rawQuizzes
          .map((quiz) => {
            const attempts = quizAttemptMap.get(quiz.id);
            const isSolved = !!attempts?.correct;
            const isInReview = reviewQuizIds.includes(quiz.id);
            let score = 0;

            if (!attempts) score += 35;
            if (attempts && !isSolved) score += 20;
            if (isInReview) score += 12;
            score += weakCategoryBoost.get(quiz.categoryId) || 0;
            if (typeof effectiveAge === 'number') {
              score -= Math.abs(quiz.targetAge - effectiveAge);
            }
            if (userBookmarks.includes(quiz.id)) {
              score += 4;
            }

            return { id: quiz.id, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((quiz) => quiz.id);

        return {
          todayLabel: getTodayLabel(),
          dailyQuizIds,
          reviewQuizIds: reviewQuizIds.slice(0, 12),
          weakCategories,
        };
      })()
    : undefined;

  return (
    <QuizClientWrapper
      initialQuizzes={quizzes}
      categories={displayCategories}
      userBookmarks={userBookmarks}
      userLikes={userLikes}
      userHistories={userHistories}
      userTargetAge={effectiveAge}
      userStatus={userStatus}
      initialSearchQuery={searchQuery}
      initialCategory={activeCategory}
      studyRecommendations={studyRecommendations}
    />
  );
}
