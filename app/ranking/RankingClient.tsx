// Path: app/ranking/RankingClient.tsx
// Title: Ranking Client Component
// Purpose: Interactive UI for displaying user leaderboards.

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePreferredLocale } from '../hooks/usePreferredLocale';

type RankingEntry = {
  id: string;
  name: string;
  clerkId?: string | null;
  score: number;
  level: number;
  totalAttempts?: number;
};

type RankingClientProps = {
  solveRankings: RankingEntry[];
  accuracyRankings: RankingEntry[];
  currentUserClerkId?: string;
  userStatus?: { xp: number; level: number; role: string };
};

const COPY = {
  ja: {
    hero: 'ランキング',
    body: '学ぶ楽しさを追求する、トップランナーたちの記録です。',
    solveTab: '解いた問題数',
    accuracyTab: '正解率',
    rankUser: '順位 / ユーザー',
    solved: '解答数',
    accuracy: '正解率',
    attempts: '挑戦',
    scoreUnit: '問',
    noData: 'データがまだありません',
    solveNote: '* 正解したユニークなクイズの合計数です。',
    accuracyNote: '* 最低 5 問以上のクイズに挑戦したユーザーのみ表示されます。',
    realtime: 'ランキングはリアルタイムで集計されます。',
  },
  en: {
    hero: 'Top Learners',
    body: 'A live record of the learners who keep challenging themselves.',
    solveTab: 'Solved quizzes',
    accuracyTab: 'Accuracy',
    rankUser: 'Rank / User',
    solved: 'Solved',
    accuracy: 'Accuracy',
    attempts: 'Attempts',
    scoreUnit: 'q',
    noData: 'No ranking data yet',
    solveNote: '* Based on the total number of unique quizzes answered correctly.',
    accuracyNote: '* Only users with at least 5 attempts are shown.',
    realtime: 'Rankings are updated in real time.',
  },
  zh: {
    hero: '排行榜',
    body: '这里记录着不断挑战自我、持续学习的优秀用户。',
    solveTab: '解答题目数',
    accuracyTab: '正确率',
    rankUser: '排名 / 用户',
    solved: '解答数',
    accuracy: '正确率',
    attempts: '作答',
    scoreUnit: '题',
    noData: '暂时还没有排行榜数据',
    solveNote: '* 统计的是答对过的不同题目总数。',
    accuracyNote: '* 只显示至少作答 5 题的用户。',
    realtime: '排行榜会实时更新。',
  },
} as const;

export default function RankingClient({
  solveRankings,
  accuracyRankings,
  currentUserClerkId,
  userStatus,
}: RankingClientProps) {
  const { locale, setLocale } = usePreferredLocale();
  const [activeTab, setActiveTab] = useState<'solve' | 'accuracy'>('solve');
  const t = COPY[locale];

  const currentRankings = activeTab === 'solve' ? solveRankings : accuracyRankings;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]" suppressHydrationWarning>
      <Header 
        locale={locale} 
        setLocale={setLocale} 
        userStatus={userStatus} 
        hideSearch={true} 
      />

      <main className="pt-24 max-w-4xl mx-auto px-4">
        {/* ヒーローセクション */}
        <section className="text-center mb-12">
          <div className="inline-block p-5 bg-amber-500/10 rounded-3xl mb-4">
            <Image src="/icons/ranking.svg" alt="" width={48} height={48} className="w-12 h-12 opacity-80" />
          </div>
          <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
            {t.hero}
          </h1>
          <p className="text-zinc-500 font-bold max-w-md mx-auto">
            {t.body}
          </p>
        </section>

        {/* タブ切り替え */}
        <div className="flex bg-[var(--card)] p-1.5 rounded-2xl border border-[var(--border)] mb-8">
          <button 
            onClick={() => setActiveTab('solve')}
            className={`flex-1 py-3 px-6 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'solve' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Image src="/icons/puzzle.svg" alt="" width={16} height={16} className={`w-4 h-4 transition-colors ${activeTab === 'solve' ? 'brightness-0 invert' : 'opacity-60 grayscale'}`} />
            {t.solveTab}
          </button>
          <button 
            onClick={() => setActiveTab('accuracy')}
            className={`flex-1 py-3 px-6 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'accuracy' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Image src="/icons/target.svg" alt="" width={16} height={16} className={`w-4 h-4 transition-colors ${activeTab === 'accuracy' ? 'brightness-0 invert' : 'opacity-60 grayscale'}`} />
            {t.accuracyTab}
          </button>
        </div>

        {/* ランキングリスト */}
        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
             <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.rankUser}</span>
             <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
               {activeTab === 'solve' ? t.solved : t.accuracy}
             </span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {currentRankings.length > 0 ? (
              currentRankings.map((user, index) => {
                const isTop3 = index < 3;
                const isMe = user.clerkId === currentUserClerkId;
                
                return (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-5 transition-colors ${
                      isMe ? 'bg-amber-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* ランク */}
                      <div className="w-10 flex flex-col items-center justify-center">
                        {index === 0 ? (
                          <span className="text-2xl">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-2xl">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-2xl">🥉</span>
                        ) : (
                          <span className="text-lg font-black text-zinc-300">#{index + 1}</span>
                        )}
                      </div>

                      {/* ユーザー情報 */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className={`font-black tracking-tight ${isMe ? 'text-amber-600' : ''}`}>
                                {user.name}
                            </span>
                            {isMe && (
                                <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-black">YOU</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-zinc-400">LV.{user.level}</span>
                           {activeTab === 'accuracy' && (
                             <span className="text-[10px] font-bold text-zinc-300">({user.totalAttempts} {t.attempts})</span>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* スコア */}
                    <div className="text-right">
                      <div className={`text-xl font-black ${isTop3 ? 'text-[var(--foreground)]' : 'text-zinc-500'}`}>
                        {user.score}
                        <span className="text-xs ml-1 opacity-60">
                          {activeTab === 'solve' ? t.scoreUnit : '%'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-20 text-center text-zinc-400 font-bold">
                {t.noData}
              </div>
            )}
          </div>
        </div>

        {/* 補足情報 */}
        <p className="mt-8 text-center text-xs font-bold text-zinc-400 leading-relaxed">
          {activeTab === 'solve' ? (
            t.solveNote
          ) : (
            t.accuracyNote
          )}
          <br />
          {t.realtime}
        </p>
      </main>
      <Footer />
    </div>
  );
}
