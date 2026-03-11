// Path: app/channel/[id]/page.tsx
// Title: Creator Channel Page
// Purpose: Displays a creator's profile and the quizzes they have created.

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import QuizClientWrapper from '../../components/QuizClientWrapper';
import SubscribeButton from '../../components/SubscribeButton';
import { auth } from '@clerk/nextjs/server';

export default async function ChannelPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const { userId: clerkId } = await auth();

  // Fetch channel info
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      quizzes: {
        include: {
          translations: {
            where: { locale: 'ja' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { subscribers: true, quizzes: true }
      }
    },
  });

  if (!channel) {
    notFound();
  }

  // Check login user's subscription status
  let initialSubscribed = false;
  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        subscriptions: { where: { channelId: id } }
      }
    });
    if (user && user.subscriptions.length > 0) {
      initialSubscribed = true;
    }
  }

  // Format quizzes for the client wrapper
  const quizzes = channel.quizzes.map((q: any) => {
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
      type: t.type,
      options: t.options ? (t.options as string[]) : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50 pt-16">
      {/* チャンネルヘッダー */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-zinc-200 overflow-hidden relative border-4 border-white shadow-sm flex-shrink-0">
              {channel.avatarUrl ? (
                <Image src={channel.avatarUrl} alt={channel.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400 bg-zinc-100">
                  {channel.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-zinc-900 mb-2">{channel.name}</h1>
              <p className="text-zinc-500 mb-4">{channel.description || 'まだ自己紹介はありません'}</p>
              <div className="flex gap-4 text-sm font-bold text-zinc-600">
                <span>登録者 {channel._count.subscribers}人</span>
                <span>•</span>
                <span>公開クイズ {channel._count.quizzes}問</span>
              </div>
            </div>
            <div>
              <SubscribeButton 
                channelId={channel.id} 
                initialSubscribed={initialSubscribed} 
                isLoggedIn={!!clerkId} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* チャンネルのクイズ一覧 */}
      <div className="max-w-7xl mx-auto py-8">
        <h2 className="text-xl font-bold text-zinc-800 px-6 mb-6">公開中のクイズ</h2>
        {quizzes.length > 0 ? (
          <QuizClientWrapper initialQuizzes={quizzes} hideHeader={true} />
        ) : (
          <div className="text-center py-20 text-zinc-500 font-bold">
            まだクイズが投稿されていません
          </div>
        )}
      </div>
    </div>
  );
}
