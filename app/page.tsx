/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/page.tsx
// Title: YouTube-like Main Dashboard (Server Component)
// Purpose: Fetches quiz data from the database and passes it to the client component.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import QuizClientWrapper from './components/QuizClientWrapper';
import { Quiz, StudyRecommendations, WeakCategoryInsight } from './types';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';
import { ensureLocalUser } from '@/lib/clerk-sync';



export const revalidate = 60; // 1分間のキャッシュを許可

function getTodayLabel() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// Server Component (async)
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; minAge?: string; maxAge?: string }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const { q: searchQuery, category: activeCategory, minAge: minAgeParam, maxAge: maxAgeParam } = await searchParams;
  const { userId: clerkId } = await auth();

  // ログイン中のユーザーがいればその設定・履歴を取得
  let userBookmarks: string[] = [];
  let userLikes: string[] = [];
  let userHistories: string[] = [];
  let userTargetAge: number | null = null;
  let userStatus: { xp: number; level: number; role: string } | undefined = undefined;
  let userHistoryEntries: Array<{ quizId: string; isCorrect: boolean; createdAt: Date }> = [];
  let effectiveAge: number | null = null;

  if (clerkId) {
    // 常に最新のユーザー情報を確保（開発環境の移行等でClerkIDが変わっていても再リンクされる）
    const user = await ensureLocalUser(clerkId, prisma);

    // 改めて詳細情報を取得
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        bookmarks: true,
        likes: true,
        histories: true,
      },
    });

    if (fullUser) {
      userBookmarks = fullUser.bookmarks.map((b) => b.quizId);
      userLikes = fullUser.likes.map((l) => l.quizId);
      userHistories = fullUser.histories.filter((h) => h.isCorrect).map((h) => h.quizId);
      userHistoryEntries = fullUser.histories.map((h) => ({
        quizId: h.quizId,
        isCorrect: h.isCorrect,
        createdAt: h.createdAt,
      }));
      userTargetAge = fullUser.targetAge;
      userStatus = { xp: fullUser.xp, level: fullUser.level, role: fullUser.role };

      // 年齢の計算
      if (fullUser.birthDate) {
        const today = new Date();
        const birth = new Date(fullUser.birthDate);
        effectiveAge = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
          effectiveAge--;
        }
      } else if (fullUser.targetAge) {
        effectiveAge = fullUser.targetAge;
      }

      // オンボーディングが未完了（生年月日がない）の場合はオンボーディングへ
      // ただし、ADMINはスキップ可能とする
      if (!fullUser.birthDate && fullUser.role !== 'ADMIN') {
        redirect('/onboarding');
      }
    }
  }
  // 年齢範囲のデフォルト設定
  let defaultMin = 0;
  let defaultMax = 100;
  const isAdmin = userStatus?.role === 'ADMIN';

  if (isAdmin) {
    defaultMin = 0;
    defaultMax = 100;
  } else if (effectiveAge !== null) {
    if (effectiveAge >= 16) {
      defaultMin = 16;
      defaultMax = 100;
    } else {
      defaultMin = effectiveAge;
      defaultMax = Math.min(effectiveAge + 3, 100);
    }
  }

  const parsedMin = minAgeParam ? parseInt(minAgeParam) : NaN;
  const parsedMax = maxAgeParam ? parseInt(maxAgeParam) : NaN;

  const currentMinAge = isNaN(parsedMin) ? defaultMin : parsedMin;
  const currentMaxAge = isNaN(parsedMax) ? defaultMax : parsedMax;

  // 並列でデータを取得開始
  const [allCategories, rawQuizzesResult] = await Promise.all([
    prisma.category.findMany({
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
    }),
    prisma.quiz.findMany({
      where: {
        AND: [
          { targetAge: { gte: currentMinAge, lte: currentMaxAge } },
          // カテゴリーの年齢範囲フィルタを結合条件で記述
          {
            category: {
              AND: [
                { minAge: { lte: currentMaxAge } },
                { OR: [{ maxAge: null }, { maxAge: { gte: currentMinAge } }] }
              ]
            }
          },
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
        _count: {
          select: { histories: true }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 48, // 初期表示を48件に制限して高速化
    })
  ]);

  const rawQuizzes = [...rawQuizzesResult];

  // サイドバー用のカテゴリー（表示されているすべてのジャンルを許可）
  const displayCategoriesRaw = allCategories.filter(c => (c.nameJa || c.name) && (c.nameJa || c.name).trim() !== '');

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
      viewCount: q._count?.histories || 0,
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
      initialMinAge={currentMinAge}
      initialMaxAge={currentMaxAge}
      studyRecommendations={studyRecommendations}
    />
  );
}
