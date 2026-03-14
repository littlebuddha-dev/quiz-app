// Path: app/components/QuizClient.tsx
// Title: Quiz Client Component
// Purpose: Handles state (search, filter, modal) for the Quiz Dashboard
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar, { SidebarContents } from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { Quiz, Locale } from '../types';
import LatexRenderer from './LatexRenderer';
import AdSense from './AdSense';

// 定数・辞書は元のpage.tsxから移行
const DICTIONARY: Record<Locale, { search: string; hint: string; answer: string; submit: string; age: string; close: string; typeAnswer: string; }> = {
  ja: { search: '検索...', hint: 'ヒントを見る', answer: 'こたえ', submit: '回答する', age: '歳向け', close: '閉じる', typeAnswer: '答えを入力してください' },
  en: { search: 'Search...', hint: 'Show Hint', answer: 'Answer', submit: 'Submit', age: 'y/o', close: 'Close', typeAnswer: 'Type your answer' },
  zh: { search: '搜索...', hint: '查看提示', answer: '答案', submit: '提交', age: '岁以上', close: '关闭', typeAnswer: '输入您的答案' },
};

const CATEGORY_MAP: Record<Locale, Record<string, string>> = {
  ja: { '算数': '算数', '国語': '国語', '理科': '理科', '社会': '社会', '英語': '英語', '論理パズル': '論理パズル', 'プログラミング': 'プログラミング' },
  en: { '算数': 'Math', '国語': 'Language', '理科': 'Science', '社会': 'Social', '英語': 'English', '論理パズル': 'Logic', 'プログラミング': 'Coding' },
  zh: { '算数': '算术', '国語': '语文', '理科': '科学', '社会': '社会', '英語': '英语', '論理パズル': '逻辑', 'プログラミング': '编程' },
};

type QuizClientProps = {
  initialQuizzes: Quiz[];
  userBookmarks?: string[];
  userLikes?: string[];
  userHistories?: string[];
  userTargetAge?: number | null;
  userStatus?: { xp: number; level: number; role: string };
  initialSearchQuery?: string;
  initialCategory?: string;
}

export default function QuizClient({ 
  initialQuizzes, 
  categories,
  userBookmarks = [], 
  userLikes = [], 
  userHistories = [], 
  userTargetAge, 
  userStatus,
  initialSearchQuery = '', 
  initialCategory = 'すべて',
  hideHeader = false 
}: QuizClientProps & { categories: any[], hideHeader?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>('ja');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // パーソナライズ用の状態管理（セットを使って高速にO(1)で存在確認）
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(userBookmarks));
  const [histories, setHistories] = useState<Set<string>>(new Set(userHistories));

  const t = DICTIONARY[locale];

  // URLクエリを更新するヘルパー
  const updateQuery = (params: Record<string, string | null>) => {
    const newSearchParams = new URLSearchParams(searchParams?.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });
    router.push(`/?${newSearchParams.toString()}`);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    updateQuery({ q: val || null });
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    updateQuery({ category: category === 'すべて' ? null : category });
  };

  // 表示用クイズ（サーバーサイドで既にフィルタリング済みだが、年齢ソートのみクライアントで適用）
  const displayQuizzes = [...initialQuizzes].sort((a, b) => {
    // ログインユーザーの対象年齢が設定されている場合、対象年齢に近いクイズを上位に表示
    if (typeof userTargetAge === 'number') {
      const diffA = Math.abs(a.targetAge - userTargetAge);
      const diffB = Math.abs(b.targetAge - userTargetAge);
      if (diffA !== diffB) return diffA - diffB;
    }
    return 0;
  });

  return (
    <div className={hideHeader ? '' : 'min-h-screen bg-[var(--background)] text-[var(--foreground)]'} suppressHydrationWarning>
      {/* トップバー */}
      {!hideHeader && (
        <Header 
          locale={locale} 
          setLocale={setLocale}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          userStatus={userStatus}
        />
      )}

      {/* サイドバー */}
      <Sidebar locale={locale} categories={categories} activeCategory={activeCategory} onSelectCategory={handleCategorySelect} />

      {/* メインコンテンツ */}
      <main className="pt-20 md:pl-72 px-4 sm:px-6 pb-10">
        <h1 className="sr-only">Cue - すべての人に学ぶことの楽しさを伝えるクイズプラットフォーム</h1>
        {/* モバイル向けカテゴリー表示（横スクロール） */}
        <div className="md:hidden flex overflow-x-auto pb-4 gap-2 no-scrollbar -mx-4 px-4 mb-4">
          <SidebarContents locale={locale} categories={categories} activeCategory={activeCategory} onSelectCategory={handleCategorySelect} isMobile />
        </div>

        <AdSense slot="home" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {displayQuizzes.length > 0 ? (
             displayQuizzes.map((quiz) => {
              const qt = quiz.translations[locale] || quiz.translations['ja'];
              const cardImage = (qt.imageUrl && qt.imageUrl !== "") 
                ? qt.imageUrl 
                : (quiz.imageUrl && quiz.imageUrl !== "") 
                  ? quiz.imageUrl 
                  : 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop';
              const isDataUri = cardImage.startsWith('data:');
              const translatedCategory = CATEGORY_MAP[locale][quiz.category] || quiz.category;

              return (
                <Link 
                  href={`/watch/${quiz.id}`}
                  key={quiz.id} 
                  className="group cursor-pointer flex flex-col gap-3"
                >
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shadow-md">
                    {cardImage ? (
                      <Image 
                        src={cardImage} 
                        alt={qt.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                        unoptimized={isDataUri}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 text-xs">No Image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-lg border border-white/10">
                      {quiz.targetAge}{t.age}
                    </div>
                    {histories.has(quiz.id) && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md border border-white/20">
                        {locale === 'ja' ? 'クリア！' : locale === 'en' ? 'DONE' : '完成'}
                      </div>
                    )}
                    {bookmarks.has(quiz.id) && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md border border-white/20">
                        ★
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">
                      <LatexRenderer text={qt.title} />
                    </h3>
                    <div className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">{translatedCategory}</div>
                  </div>
                </Link>
              );
            })
          ) : (
             <div className="col-span-full flex flex-col items-center justify-center p-20 text-zinc-400">
                 <div className="text-xl font-bold">クイズが見つかりません</div>
                 <div className="mt-2 text-sm">左側のメニューからAIでクイズを生成してみてください。</div>
             </div>
          )}
        </div>
      </main>
      <div className="md:pl-72">
        <Footer />
      </div>
    </div>
  );
}
