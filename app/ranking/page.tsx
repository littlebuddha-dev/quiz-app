// Path: app/ranking/page.tsx
// Title: Ranking Page (Server Component)
// Purpose: Aggregates user performance data and displays leaderboard.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '@clerk/nextjs/server';
import RankingClient from './RankingClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ランキング | Cue',
  description: 'みんなの頑張りを見てみよう！解答数と正解率のトップリーダーボード。',
};

export default async function RankingPage() {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const { userId: clerkId } = await auth();

  // 1. 全ユーザーの情報を取得（必要最小限）
  // 注意: 本来は大規模データの場合、バックグラウンドでの集計やインデックスが必要ですが、
  // 現時点では Prisma で集計を行います。
  const allUsers = await prisma.user.findMany({
    include: {
      histories: true,
      _count: {
        select: { histories: true }
      }
    }
  });

  // ログインユーザーの情報を特定
  let currentUserStatus = undefined;
  if (clerkId) {
      const user = allUsers.find(u => u.clerkId === clerkId);
      if (user) {
          currentUserStatus = { xp: user.xp, level: user.level, role: user.role };
      }
  }

  // 2. 解答数ランキングの算出
  // ユニークな正解数をカウント
  const solveRankings = allUsers.map(user => {
    const solvedQuizzes = new Set(
      user.histories.filter(h => h.isCorrect).map(h => h.quizId)
    );
    return {
      id: user.id,
      name: user.name || 'ゲストユーザー',
      clerkId: user.clerkId,
      score: solvedQuizzes.size,
      level: user.level,
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 20); // 上位20名

  // 3. 正解率ランキングの算出
  // 条件: 最低10問以上挑戦しているユーザー
  const accuracyRankings = allUsers.map(user => {
    const totalAttempts = user.histories.length;
    const correctAnswers = user.histories.filter(h => h.isCorrect).length;
    const accuracy = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;
    
    return {
      id: user.id,
      name: user.name || 'ゲストユーザー',
      clerkId: user.clerkId,
      score: Math.round(accuracy * 10) / 10, // 小数点第1位まで
      totalAttempts,
      level: user.level,
    };
  })
  .filter(u => u.totalAttempts >= 5) // 最低5問以上の挑戦者に限定（精度確保のため）
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

  return (
    <RankingClient 
      solveRankings={solveRankings}
      accuracyRankings={accuracyRankings}
      currentUserClerkId={clerkId || undefined}
      userStatus={currentUserStatus}
    />
  );
}
