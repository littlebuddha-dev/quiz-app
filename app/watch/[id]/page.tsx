// Path: app/watch/[id]/page.tsx
// Title: Watch Page (Detail)
// Purpose: Individual page for a quiz, showing details and comments.

import { createPrisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import WatchClientWrapper from './WatchClientWrapper';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { translations: { where: { locale: 'ja' } } },
  });

  if (!quiz) return { title: 'Not Found' };
  const t = quiz.translations[0];

  return {
    title: t?.title || 'クイズ詳細',
    description: t?.question || 'クイズに挑戦して、学ぶ楽しさを体験しよう。',
    openGraph: {
      title: `${t?.title} | Cue`,
      description: t?.question,
      images: [quiz.imageUrl || '/og-image.png'],
    },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const { id } = await params;
  const { userId: clerkId } = await auth();

  // 1. クイズ情報の取得
  const rawQuiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      translations: true,
      channel: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!rawQuiz || rawQuiz.translations.length === 0) {
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
    rawQuiz.translations.map((t) => [
      t.locale,
      {
        title: t.title,
        question: t.question,
        hint: t.hint,
        answer: t.answer,
        type: t.type,
        options: t.options ? (t.options as string[]) : undefined,
        imageUrl: t.imageUrl,
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
      translations: { where: { locale: 'ja' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const relatedQuizzes = rawRelated.map((q: any) => ({
    id: q.id,
    title: q.translations[0]?.title || '無題',
    imageUrl: q.imageUrl,
    targetAge: q.targetAge,
  }));

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
