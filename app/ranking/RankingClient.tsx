// Path: app/ranking/RankingClient.tsx
// Title: Ranking Client Component
// Purpose: Interactive UI for displaying user leaderboards.

'use client';

import { useState } from 'react';
import Header from '../components/Header';
import { Locale } from '../types';

type RankingEntry = {
  id: string;
  name: string;
  clerkId: string;
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

export default function RankingClient({
  solveRankings,
  accuracyRankings,
  currentUserClerkId,
  userStatus,
}: RankingClientProps) {
  const [locale, setLocale] = useState<Locale>('ja');
  const [activeTab, setActiveTab] = useState<'solve' | 'accuracy'>('solve');

  const currentRankings = activeTab === 'solve' ? solveRankings : accuracyRankings;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
      <Header 
        locale={locale} 
        setLocale={setLocale} 
        userStatus={userStatus} 
        hideSearch={true} 
      />

      <main className="pt-24 max-w-4xl mx-auto px-4">
        {/* ヒーローセクション */}
        <section className="text-center mb-12">
          <div className="inline-block p-4 bg-amber-500/10 rounded-3xl mb-4">
             <span className="text-5xl">🏆</span>
          </div>
          <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
            Top Learners
          </h1>
          <p className="text-zinc-500 font-bold max-w-md mx-auto">
            学ぶ楽しさを追求する、トップランナーたちの記録です。
          </p>
        </section>

        {/* タブ切り替え */}
        <div className="flex bg-[var(--card)] p-1.5 rounded-2xl border border-[var(--border)] mb-8 shadow-sm">
          <button 
            onClick={() => setActiveTab('solve')}
            className={`flex-1 py-3 px-6 rounded-xl font-black text-sm transition-all ${
              activeTab === 'solve' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            🧩 解いた問題数
          </button>
          <button 
            onClick={() => setActiveTab('accuracy')}
            className={`flex-1 py-3 px-6 rounded-xl font-black text-sm transition-all ${
              activeTab === 'accuracy' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            🎯 正解率
          </button>
        </div>

        {/* ランキングリスト */}
        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
             <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Rank / User</span>
             <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
               {activeTab === 'solve' ? 'Solved' : 'Accuracy'}
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
                             <span className="text-[10px] font-bold text-zinc-300">({user.totalAttempts} 挑戦)</span>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* スコア */}
                    <div className="text-right">
                      <div className={`text-xl font-black ${isTop3 ? 'text-[var(--foreground)]' : 'text-zinc-500'}`}>
                        {user.score}
                        <span className="text-xs ml-1 opacity-60">
                          {activeTab === 'solve' ? '問' : '%'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-20 text-center text-zinc-400 font-bold">
                データがまだありません
              </div>
            )}
          </div>
        </div>

        {/* 補足情報 */}
        <p className="mt-8 text-center text-xs font-bold text-zinc-400 leading-relaxed">
          {activeTab === 'solve' ? (
            "* 正解したユニークなクイズの合計数です。"
          ) : (
            "* 最低 5 問以上のクイズに挑戦したユーザーのみ表示されます。"
          )}
          <br />
          ランキングはリアルタイムで集計されます。
        </p>
      </main>
    </div>
  );
}
