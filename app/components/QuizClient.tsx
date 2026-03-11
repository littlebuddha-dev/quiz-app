// Path: app/components/QuizClient.tsx
// Title: Quiz Client Component
// Purpose: Handles state (search, filter, modal) for the Quiz Dashboard
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Sidebar from './Sidebar';
import { Quiz, Locale } from '../types'; // Adjusted import if necessary

// 定数・辞書は元のpage.tsxから移行
const DICTIONARY: Record<Locale, { search: string; hint: string; answer: string; submit: string; age: string; close: string; typeAnswer: string; }> = {
  ja: { search: '検索...', hint: 'ヒントを見る', answer: 'こたえ', submit: '回答する', age: '歳向け', close: '閉じる', typeAnswer: '答えを入力してください' },
  en: { search: 'Search...', hint: 'Show Hint', answer: 'Answer', submit: 'Submit', age: 'y/o', close: 'Close', typeAnswer: 'Type your answer' },
  zh: { search: '搜索...', hint: '查看提示', answer: '答案', submit: '提交', age: '岁以上', close: '关闭', typeAnswer: '输入您的答案' },
};

type QuizClientProps = {
  initialQuizzes: Quiz[];
  userBookmarks?: string[];
  userLikes?: string[];
  userHistories?: string[];
  userTargetAge?: number | null;
}

export default function QuizClient({ initialQuizzes, userBookmarks = [], userLikes = [], userHistories = [], userTargetAge, hideHeader = false }: QuizClientProps & { hideHeader?: boolean }) {
  const [locale, setLocale] = useState<Locale>('ja');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('すべて');

  // パーソナライズ用の状態管理（セットを使って高速にO(1)で存在確認）
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(userBookmarks));
  const [histories, setHistories] = useState<Set<string>>(new Set(userHistories));

  const t = DICTIONARY[locale];

  // 検索とカテゴリによる絞り込みと、年齢によるソート
  const filteredQuizzes = initialQuizzes.filter((quiz) => {
    const matchCategory = activeCategory === 'すべて' || activeCategory === 'All' || activeCategory === '全部' || quiz.category === activeCategory;
    const matchSearch = quiz.title.includes(searchQuery) || quiz.question.includes(searchQuery);
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    // ログインユーザーの対象年齢が設定されている場合、対象年齢に近いクイズを上位に表示
    if (typeof userTargetAge === 'number') {
      const diffA = Math.abs(a.targetAge - userTargetAge);
      const diffB = Math.abs(b.targetAge - userTargetAge);
      if (diffA !== diffB) return diffA - diffB;
    }
    return 0;
  });

  return (
    <div className={hideHeader ? '' : 'min-h-screen bg-zinc-50'}>
      {/* トップバー */}
      {!hideHeader && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center justify-between px-6 border-b border-zinc-200 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
          <span className="text-xl font-black text-zinc-800 tracking-tight hidden sm:block">NanoQuizTube</span>
        </div>
        
        <div className="flex-1 max-w-2xl px-6">
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-zinc-300 rounded-full px-6 py-2 bg-zinc-100 focus:bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-black"
          />
        </div>

        <div className="flex items-center gap-4">
          <select
            defaultValue={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="border-none bg-transparent text-zinc-600 font-bold cursor-pointer focus:outline-none"
          >
            <option value="ja">JP</option>
            <option value="en">EN</option>
            <option value="zh">ZH</option>
          </select>
          {/* Clerk認証UI */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-colors">
                ログイン
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
          </SignedIn>
        </div>
      </header>
      )}

      {/* サイドバー */}
      <Sidebar locale={locale} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

      {/* メインコンテンツ（グリッド表示） */}
      <main className="pt-20 md:pl-72 pr-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredQuizzes.length > 0 ? (
             filteredQuizzes.map((quiz) => (
              <Link 
                href={`/watch/${quiz.id}`}
                key={quiz.id} 
                className="group cursor-pointer flex flex-col gap-3"
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-200">
                  <Image src={quiz.imageUrl} alt={quiz.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                    {quiz.targetAge}{t.age}
                  </div>
                  {histories.has(quiz.id) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                      クリア済
                    </div>
                  )}
                  {bookmarks.has(quiz.id) && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                      ★保存
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                    {quiz.title}
                  </h3>
                  <div className="text-sm text-zinc-500 mt-1">{quiz.category}</div>
                </div>
              </Link>
            ))
          ) : (
             <div className="col-span-full flex flex-col items-center justify-center p-20 text-zinc-400">
                 <div className="text-xl font-bold">クイズが見つかりません</div>
                 <div className="mt-2 text-sm">左側のメニューからAIでクイズを生成してみてください。</div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
