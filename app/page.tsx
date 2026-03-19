// Path: app/page.tsx
// Title: YouTube-like Main Dashboard (Server Component)
// Purpose: Fetches quiz data from the database and passes it to the client component.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import QuizClientWrapper from './components/QuizClientWrapper';
import { Quiz } from './types';
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
  const allCategories = await prisma.$queryRawUnsafe<CategoryRow[]>(
    'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "icon" FROM "Category" ORDER BY "sortOrder" ASC, "minAge" ASC, "createdAt" ASC'
  );

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
