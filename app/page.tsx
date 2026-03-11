// Path: app/page.tsx
// Title: YouTube-like Main Dashboard
// Purpose: Integrates Topbar, Sidebar, Quiz Grid, and Quiz Detail View with Search and i18n functionalities.

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Sidebar from './components/Sidebar';
import { Quiz, Locale } from './types';

// 言語辞書
const DICTIONARY = {
  ja: { search: '検索...', hint: 'ヒントを見る', answer: 'こたえ', submit: '回答する', age: '歳向け', close: '閉じる', typeAnswer: '答えを入力してください' },
  en: { search: 'Search...', hint: 'Show Hint', answer: 'Answer', submit: 'Submit', age: 'y/o', close: 'Close', typeAnswer: 'Type your answer' },
  zh: { search: '搜索...', hint: '查看提示', answer: '答案', submit: '提交', age: '岁以上', close: '关闭', typeAnswer: '输入您的答案' },
};

// DB保存前のモックデータ
const MOCK_QUIZZES: Quiz[] = [
  {
    id: '1',
    title: 'リンゴとバナナのおかいもの',
    category: '算数',
    targetAge: 8,
    question: 'りんご100円、バナナ50円。計3個で250円。りんごは何個？',
    hint: '全部バナナだったらいくらになるか考えてみよう。',
    answer: '2個 (りんご2個=200円、バナナ1個=50円)',
    imageUrl: 'https://placehold.jp/3d4070/ffffff/1920x1080.jpg?text=Math+Quiz', // 実際の画像URLに差し替えてください
    type: 'CHOICE',
    options: ['1個', '2個', '3個'],
  },
  {
    id: '2',
    title: 'どうぶつの じゅんじょあて！',
    category: '国語',
    targetAge: 7,
    question: 'くまさんの すぐ うえ。そして、ねずみさんの すぐ ひだり。どの どうぶつかな？',
    hint: '2つの条件を同時に満たす場所を探してね。',
    answer: 'ねこ',
    imageUrl: 'https://placehold.jp/40703d/ffffff/1920x1080.jpg?text=Logic+Quiz',
    type: 'TEXT',
  },
];

export default function Home() {
  const [locale, setLocale] = useState<Locale>('ja');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showDetailHint, setShowDetailHint] = useState(false);
  const [showDetailAnswer, setShowDetailAnswer] = useState(false);

  const t = DICTIONARY[locale];

  // 検索とカテゴリによる絞り込み（年齢フィルター機能の実装ベース）
  const filteredQuizzes = MOCK_QUIZZES.filter((quiz) => {
    const matchCategory = activeCategory === 'すべて' || activeCategory === 'All' || activeCategory === '全部' || quiz.category === activeCategory;
    const matchSearch = quiz.title.includes(searchQuery) || quiz.question.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  const handleThumbnailClick = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setShowDetailHint(false);
    setShowDetailAnswer(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* トップバー */}
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
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="border-none bg-transparent text-zinc-600 font-bold cursor-pointer focus:outline-none"
          >
            <option value="ja">JP</option>
            <option value="en">EN</option>
            <option value="zh">ZH</option>
          </select>
          {/* ユーザーアバター（仮） */}
          <div className="w-9 h-9 bg-zinc-300 rounded-full border-2 border-white shadow-sm"></div>
        </div>
      </header>

      {/* サイドバー */}
      <Sidebar locale={locale} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

      {/* メインコンテンツ（グリッド表示） */}
      <main className="pt-20 md:pl-72 pr-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div 
              key={quiz.id} 
              className="group cursor-pointer flex flex-col gap-3"
              onClick={() => handleThumbnailClick(quiz)}
            >
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-200">
                <Image src={quiz.imageUrl} alt={quiz.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                  {quiz.targetAge}{t.age}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                  {quiz.title}
                </h3>
                <p className="text-sm text-zinc-500 mt-1">{quiz.category}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 詳細表示モーダル（動画視聴画面の代わり） */}
      {selectedQuiz && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center overflow-y-auto p-4 md:p-10 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
            <button 
              onClick={() => setSelectedQuiz(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            
            <div className="w-full aspect-video relative bg-black">
              <Image src={selectedQuiz.imageUrl} alt={selectedQuiz.title} fill className="object-contain" />
            </div>

            <div className="p-8 flex flex-col md:flex-row gap-8 bg-zinc-50 flex-1">
              <div className="flex-1">
                <h2 className="text-3xl font-black text-zinc-900 mb-2">{selectedQuiz.title}</h2>
                <div className="flex gap-2 mb-6">
                  <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full">{selectedQuiz.category}</span>
                  <span className="bg-zinc-200 text-zinc-700 text-sm font-bold px-3 py-1 rounded-full">{selectedQuiz.targetAge}{t.age}</span>
                </div>
                
                <p className="text-xl font-bold text-zinc-800 mb-8 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm leading-relaxed">
                  {selectedQuiz.question}
                </p>

                {/* 問題形式に応じた入力フォーム */}
                {selectedQuiz.type === 'CHOICE' && selectedQuiz.options ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {selectedQuiz.options.map((opt, i) => (
                      <button key={i} className="bg-white border-2 border-zinc-300 hover:border-amber-500 hover:bg-amber-50 text-zinc-800 font-bold text-lg py-4 rounded-xl transition-all shadow-sm">
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 mb-8">
                    <input type="text" placeholder={t.typeAnswer} className="flex-1 border-2 border-zinc-300 p-4 rounded-xl text-lg font-bold text-zinc-800 focus:outline-none focus:border-amber-500" />
                    <button className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 rounded-xl text-lg shadow-md transition-colors">
                      {t.submit}
                    </button>
                  </div>
                )}
              </div>

              {/* ヒントと答えエリア */}
              <div className="w-full md:w-80 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm">
                  <button onClick={() => setShowDetailHint(!showDetailHint)} className="w-full text-left font-black text-blue-800 flex justify-between">
                    💡 {t.hint}
                  </button>
                  {showDetailHint && <p className="mt-3 text-zinc-700 font-bold leading-relaxed">{selectedQuiz.hint}</p>}
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-green-200 shadow-sm">
                  <button onClick={() => setShowDetailAnswer(!showDetailAnswer)} className="w-full text-left font-black text-green-800 flex justify-between">
                    ✅ {t.answer}
                  </button>
                  {showDetailAnswer && <p className="mt-3 text-zinc-800 text-xl font-bold leading-relaxed">{selectedQuiz.answer}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}