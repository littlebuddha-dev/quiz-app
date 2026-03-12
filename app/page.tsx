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

  // DBからクイズ一覧を取得
  const rawQuizzes = await prisma.quiz.findMany({
    where: {
      AND: [
        activeCategory && activeCategory !== 'すべて' && activeCategory !== 'All' && activeCategory !== '全部'
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
      translations: {
        where: { locale: 'ja' },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 年齢によるソート (サーバーサイド)
  if (typeof userTargetAge === 'number') {
    rawQuizzes.sort((a, b) => {
      const diffA = Math.abs(a.targetAge - (userTargetAge as number));
      const diffB = Math.abs(b.targetAge - (userTargetAge as number));
      return diffA - diffB;
    });
  }

  // Prismaの型からフロントエンド用のQuiz型へマッピング
  const quizzes: Quiz[] = rawQuizzes.map((q: any) => {
    const t = q.translations[0] || {
      title: '名称未設定',
      question: '問題文がありません',
      hint: '',
      answer: '',
      type: 'TEXT',
      options: null,
    };

    return {
      id: q.id,
      title: t.title,
      category: q.categoryId,
      targetAge: q.targetAge,
      question: t.question,
      hint: t.hint,
      answer: t.answer,
      imageUrl: q.imageUrl,
      type: t.type as 'CHOICE' | 'TEXT',
      options: t.options ? (t.options as string[]) : undefined,
    };
  });

  return (
    <QuizClientWrapper
      initialQuizzes={quizzes}
      userBookmarks={userBookmarks}
      userLikes={userLikes}
      userHistories={userHistories}
      userTargetAge={userTargetAge}
      userStatus={userStatus} // Pass userStatus
      initialSearchQuery={searchQuery}
      initialCategory={activeCategory}
    />
  );
}