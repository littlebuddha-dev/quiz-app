// Path: app/watch/[id]/page.tsx
// Title: Watch Page (Detail)
// Purpose: Individual page for a quiz, showing details and comments.

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import WatchClient from './WatchClient';
import { auth } from '@clerk/nextjs/server';

export default async function WatchPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const { userId: clerkId } = await auth();

  // 1. クイズ情報の取得
  const rawQuiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      translations: { where: { locale: 'ja' } },
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
  let userName = null;

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
      userName = userDb.name || 'ゲスト';
      isBookmarked = userDb.bookmarks.length > 0;
      isLiked = userDb.likes.length > 0;
      isCleared = userDb.histories.length > 0;
    }
  }

  // クライアントコンポーネント用データフォーマット
  const t = rawQuiz.translations[0];
  const quizData = {
    id: rawQuiz.id,
    title: t.title,
    category: rawQuiz.categoryId,
    targetAge: rawQuiz.targetAge,
    question: t.question,
    hint: t.hint,
    answer: t.answer,
    imageUrl: rawQuiz.imageUrl,
    type: t.type,
    options: t.options ? (t.options as string[]) : undefined,
    channel: rawQuiz.channel ? { id: rawQuiz.channel.id, name: rawQuiz.channel.name, avatarUrl: rawQuiz.channel.avatarUrl } : null,
  };

  const initialComments = rawQuiz.comments.map((c) => ({
    id: c.id,
    content: c.content,
    userName: c.user.name || 'ゲスト',
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <WatchClient 
      quiz={quizData as any} 
      initialComments={initialComments}
      initialBookmark={isBookmarked}
      initialLike={isLiked}
      initialCleared={isCleared}
      isLoggedIn={!!clerkId}
    />
  );
}
