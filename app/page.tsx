// Path: app/page.tsx
// Title: YouTube-like Main Dashboard (Server Component)
// Purpose: Fetches quiz data from the database and passes it to the client component.

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import QuizClientWrapper from './components/QuizClientWrapper';
import { Quiz } from './types';

// Server Component (async)
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q: searchQuery, category: activeCategory } = await searchParams;
  const { userId: clerkId } = await auth();

  // ログイン中のユーザーがいればその設定・履歴を取得
  let userBookmarks: string[] = [];
  let userLikes: string[] = [];
  let userHistories: string[] = [];
  let userTargetAge: number | null = null;
  let userStatus: { xp: number; level: number; role: string } | undefined = undefined;

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
      userTargetAge = user.targetAge;
      const u = user as any;
      userStatus = { xp: u.xp, level: u.level, role: u.role }; // Assign userStatus here
    }
  }

  // ユーザーの年齢を特定
  let effectiveAge = userTargetAge || 8; // デフォルト8歳
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

  // カテゴリーを取得し、年齢制限に基づいてフィルタリング
  const allCategories = await prisma.category.findMany({
    orderBy: { minAge: 'asc' },
  });

  const filteredCategories = allCategories.filter(cat => {
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
  rawQuizzes.sort((a, b) => {
    const diffA = Math.abs(a.targetAge - effectiveAge);
    const diffB = Math.abs(b.targetAge - effectiveAge);
    return diffA - diffB;
  });

  // Prismaの型からフロントエンド用のQuiz型へマッピング
  const quizzes: Quiz[] = rawQuizzes.map((q: any) => {
    const translationsMap: any = {};
    const jaT = q.translations.find((t: any) => t.locale === 'ja') || {
      title: '名称未設定', question: '問題文がありません', hint: '', answer: '', type: 'TEXT', options: null,
    };

    ['ja', 'en', 'zh'].forEach(loc => {
      const t = q.translations.find((trans: any) => trans.locale === loc);
      translationsMap[loc] = {
        title: t?.title || jaT.title,
        question: t?.question || jaT.question,
        hint: t?.hint || jaT.hint,
        answer: t?.answer || jaT.answer,
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
    };
  });

  const displayCategories = filteredCategories.map(c => ({
    id: c.id,
    name: c.name,
    ja: c.name, // ここでは簡易的に共通
    en: c.name === '算数' ? 'Math' : c.name === '数学' ? 'Advanced Math' : c.name, // マッピングが必要なら別途
    zh: c.name === '算数' ? '算术' : c.name === '数学' ? '数学' : c.name,
  }));

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
    />
  );
}