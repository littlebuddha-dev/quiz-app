// Path: app/page.tsx
// Title: YouTube-like Main Dashboard (Server Component)
// Purpose: Fetches quiz data from the database and passes it to the client component.

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import QuizClientWrapper from './components/QuizClientWrapper';
import { Quiz } from './types';

// Server Component (async)
export default async function Home() {
  const { userId: clerkId } = await auth();

  // ログイン中のユーザーがいればその設定・履歴を取得
  let userBookmarks: string[] = [];
  let userLikes: string[] = [];
  let userHistories: string[] = [];
  let userTargetAge: number | null = null;

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
    }
  }

  // DBからクイズ一覧を取得 (デフォルトの日本語翻訳を取得する簡単な例)
  // orderByで新しい順にソート
  const rawQuizzes = await prisma.quiz.findMany({
    include: {
      translations: {
        where: { locale: 'ja' }, // 一旦、初期表示は日本語で固定
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Prismaの型からフロントエンド用(types.ts)のQuiz型へマッピング
  const quizzes: Quiz[] = rawQuizzes.map((q: any) => {
    // 翻訳データが見つからない場合のフォールバック
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
    />
  );
}