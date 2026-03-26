// Path: app/components/QuizClient.tsx
// Title: Quiz Client Component
// Purpose: Handles state (search, filter, modal) for the Quiz Dashboard
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar, { SidebarContents } from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { Quiz, Locale, StudyRecommendations } from '../types';
import LatexRenderer from './LatexRenderer';
import AdSense from './AdSense';
import { usePreferredLocale } from '../hooks/usePreferredLocale';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// 定数・辞書は元のpage.tsxから移行
const DICTIONARY: Record<Locale, { search: string; hint: string; answer: string; submit: string; age: string; close: string; typeAnswer: string; }> = {
  ja: { search: '検索...', hint: 'ヒントを見る', answer: 'こたえ', submit: '回答する', age: '歳向け', close: '閉じる', typeAnswer: '答えを入力してください' },
  en: { search: 'Search...', hint: 'Show Hint', answer: 'Answer', submit: 'Submit', age: 'y/o', close: 'Close', typeAnswer: 'Type your answer' },
  zh: { search: '搜索...', hint: '查看提示', answer: '答案', submit: '提交', age: '岁以上', close: '关闭', typeAnswer: '输入您的答案' },
};

const STUDY_COPY: Record<
  Locale,
  {
    panelTitle: string;
    panelBody: string;
    allMode: string;
    reviewMode: string;
    dailyMode: string;
    dailyTitle: string;
    reviewTitle: string;
    weaknessTitle: string;
    noDaily: string;
    noReview: string;
    noWeakness: string;
    weakAccuracy: string;
    weakAttempts: string;
    openCategory: string;
  }
> = {
  ja: {
    panelTitle: '今日の学習ダッシュボード',
    panelBody: '3分で始められるおすすめ、間違い直し、苦手の見える化をまとめました。',
    allMode: 'いつもの一覧',
    reviewMode: '間違い直しモード',
    dailyMode: '1日3分おすすめ',
    dailyTitle: '1日3分の自動おすすめ',
    reviewTitle: '間違い直しモード',
    weaknessTitle: '弱点の見える化',
    noDaily: '今日のおすすめは準備中です。まずは気になる1問から始めましょう。',
    noReview: 'まだ復習が必要な問題はありません。この調子です。',
    noWeakness: 'まだ弱点データは十分ではありません。数問解くと見えてきます。',
    weakAccuracy: '正答率',
    weakAttempts: '挑戦',
    openCategory: 'この分野を復習',
  },
  en: {
    panelTitle: "Today's Study Dashboard",
    panelBody: 'Your daily three-minute picks, retry set, and weak points are all here.',
    allMode: 'All quizzes',
    reviewMode: 'Retry mode',
    dailyMode: '3-minute daily picks',
    dailyTitle: 'Your 3-minute daily picks',
    reviewTitle: 'Retry your mistakes',
    weaknessTitle: 'Weakness insights',
    noDaily: 'Your daily picks are getting ready. Start with any quiz you like.',
    noReview: 'No retry items right now. Nice work.',
    noWeakness: 'Not enough answer history yet. Solve a few more quizzes to see trends.',
    weakAccuracy: 'Accuracy',
    weakAttempts: 'Attempts',
    openCategory: 'Review this topic',
  },
  zh: {
    panelTitle: '今日学习看板',
    panelBody: '把今日推荐、错题复习、薄弱点分析放在一起，三分钟就能开始。',
    allMode: '全部题目',
    reviewMode: '错题复习',
    dailyMode: '每日3分钟推荐',
    dailyTitle: '每日3分钟自动推荐',
    reviewTitle: '错题复习模式',
    weaknessTitle: '薄弱点可视化',
    noDaily: '今日推荐正在准备中，先从你感兴趣的题目开始吧。',
    noReview: '目前没有需要复习的错题，继续保持。',
    noWeakness: '目前答题数据还不够，先多做几题再来看趋势。',
    weakAccuracy: '正确率',
    weakAttempts: '作答次数',
    openCategory: '复习这个领域',
  },
};

const CATEGORY_MAP: Record<Locale, Record<string, string>> = {
  ja: { '算数': '算数', '国語': '国語', '理科': '理科', '社会': '社会', '英語': '英語', '論理パズル': '論理パズル', 'プログラミング': 'プログラミング' },
  en: { '算数': 'Math', '国語': 'Language', '理科': 'Science', '社会': 'Social', '英語': 'English', '論理パズル': 'Logic', 'プログラミング': 'Coding' },
  zh: { '算数': '算术', '国語': '语文', '理科': '科学', '社会': '社会', '英語': '英语', '論理パズル': '逻辑', 'プログラミング': '编程' },
};

const OFFLINE_HOME_CACHE_KEY = 'cue-offline-home-cache-v1';

function sanitizeImageForOfflineCache(imageUrl?: string | null) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) return null;
  return imageUrl;
}

function buildOfflineQuizCache(quizzes: Quiz[]) {
  return quizzes.slice(0, 40).map((quiz) => ({
    ...quiz,
    imageUrl: sanitizeImageForOfflineCache(quiz.imageUrl) || '',
    translations: {
      ja: {
        ...quiz.translations.ja,
        imageUrl: sanitizeImageForOfflineCache(quiz.translations.ja.imageUrl),
      },
      en: {
        ...quiz.translations.en,
        imageUrl: sanitizeImageForOfflineCache(quiz.translations.en.imageUrl),
      },
      zh: {
        ...quiz.translations.zh,
        imageUrl: sanitizeImageForOfflineCache(quiz.translations.zh.imageUrl),
      },
    },
  }));
}

function readOfflineHomeCache() {
  if (typeof window === 'undefined') {
    return {
      quizzes: null,
      categories: null,
      studyRecommendations: undefined,
    } as {
      quizzes: Quiz[] | null;
      categories: QuizClientWrapperProps['categories'] | null;
      studyRecommendations: StudyRecommendations | undefined;
    };
  }

  try {
    const cached = window.localStorage.getItem(OFFLINE_HOME_CACHE_KEY);
    if (!cached) {
      return {
        quizzes: null,
        categories: null,
        studyRecommendations: undefined,
      };
    }

    const parsed = JSON.parse(cached) as {
      quizzes?: Quiz[];
      categories?: QuizClientWrapperProps['categories'];
      studyRecommendations?: StudyRecommendations;
    };

    return {
      quizzes: parsed.quizzes?.length ? parsed.quizzes : null,
      categories: parsed.categories?.length ? parsed.categories : null,
      studyRecommendations: parsed.studyRecommendations,
    };
  } catch (error) {
    console.error('Failed to load offline quiz cache:', error);
    return {
      quizzes: null,
      categories: null,
      studyRecommendations: undefined,
    };
  }
}

type QuizClientProps = {
  initialQuizzes: Quiz[];
  userBookmarks?: string[];
  userLikes?: string[];
  userHistories?: string[];
  userTargetAge?: number | null;
  userStatus?: { xp: number; level: number; role: string };
  initialSearchQuery?: string;
  initialCategory?: string;
  studyRecommendations?: StudyRecommendations;
}

export type QuizClientWrapperProps = QuizClientProps & {
  categories: {
    id: string;
    name?: string;
    nameJa?: string | null;
    nameEn?: string | null;
    nameZh?: string | null;
    ja?: string;
    en?: string;
    zh?: string;
    icon?: string | null;
  }[];
  hideHeader?: boolean;
};

export default function QuizClient({ 
  initialQuizzes, 
  categories,
  userBookmarks = [], 
  userHistories = [], 
  userTargetAge, 
  userStatus,
  initialSearchQuery = '', 
  initialCategory = 'すべて',
  studyRecommendations,
  hideHeader = false 
}: QuizClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale } = usePreferredLocale();
  const isOnline = useOnlineStatus();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [studyMode, setStudyMode] = useState<'all' | 'review' | 'daily'>('all');
  const [isStudyDashboardOpen, setIsStudyDashboardOpen] = useState(false);
  const [cachedQuizzes] = useState<Quiz[] | null>(() => readOfflineHomeCache().quizzes);
  const [cachedCategories] = useState<QuizClientWrapperProps['categories'] | null>(() => readOfflineHomeCache().categories);
  const [cachedStudyRecommendations] = useState<StudyRecommendations | undefined>(() => readOfflineHomeCache().studyRecommendations);

  // パーソナライズ用の状態管理（セットを使って高速にO(1)で存在確認）
  const [bookmarks] = useState<Set<string>>(new Set(userBookmarks));
  const [histories] = useState<Set<string>>(new Set(userHistories));

  const t = DICTIONARY[locale];
  const studyText = STUDY_COPY[locale];

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OFFLINE_HOME_CACHE_KEY,
        JSON.stringify({
          quizzes: buildOfflineQuizCache(initialQuizzes),
          categories,
          studyRecommendations,
          cachedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Failed to save offline quiz cache:', error);
      try {
        window.localStorage.removeItem(OFFLINE_HOME_CACHE_KEY);
      } catch {
        // ignore cleanup failure
      }
    }
  }, [initialQuizzes, categories, studyRecommendations]);

  const sourceQuizzes = !isOnline && cachedQuizzes?.length ? cachedQuizzes : initialQuizzes;
  const sourceCategories = !isOnline && cachedCategories?.length ? cachedCategories : categories;
  const activeStudyRecommendations = !isOnline && cachedStudyRecommendations ? cachedStudyRecommendations : studyRecommendations;

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

  const reviewQuizSet = useMemo(
    () => new Set(activeStudyRecommendations?.reviewQuizIds || []),
    [activeStudyRecommendations]
  );
  const dailyQuizSet = useMemo(
    () => new Set(activeStudyRecommendations?.dailyQuizIds || []),
    [activeStudyRecommendations]
  );

  // 表示用クイズ（サーバーサイドで既にフィルタリング済みだが、年齢ソートのみクライアントで適用）
  const sortedQuizzes = [...sourceQuizzes].sort((a, b) => {
    // ログインユーザーの対象年齢が設定されている場合、対象年齢に近いクイズを上位に表示
    if (typeof userTargetAge === 'number') {
      const diffA = Math.abs(a.targetAge - userTargetAge);
      const diffB = Math.abs(b.targetAge - userTargetAge);
      if (diffA !== diffB) return diffA - diffB;
    }
    return 0;
  });

  const displayQuizzes = sortedQuizzes.filter((quiz) => {
    if (studyMode === 'review') {
      return reviewQuizSet.has(quiz.id);
    }
    if (studyMode === 'daily') {
      return dailyQuizSet.has(quiz.id);
    }
    return true;
  });

  const dailyQuizzes = sortedQuizzes.filter((quiz) => dailyQuizSet.has(quiz.id));
  const reviewQuizzes = sortedQuizzes.filter((quiz) => reviewQuizSet.has(quiz.id));

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
      <Sidebar
        locale={locale}
        categories={sourceCategories}
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
        studyMode={studyMode}
        onSelectStudyMode={setStudyMode}
      />

      {/* メインコンテンツ */}
      <main className="pt-[calc(var(--header-height)+1rem)] md:pl-72 px-4 sm:px-6 pb-10">
        <h1 className="sr-only">Cue - すべての人に学ぶことの楽しさを伝えるクイズプラットフォーム</h1>
        {/* モバイル向けカテゴリー表示（横スクロール） */}
        <div className="md:hidden pt-4 pb-4 -mx-4 px-4 mb-4 overflow-x-hidden">
          <SidebarContents
            locale={locale}
            categories={sourceCategories}
            activeCategory={activeCategory}
            onSelectCategory={handleCategorySelect}
            studyMode={studyMode}
            onSelectStudyMode={setStudyMode}
            isMobile
          />
        </div>

        {isOnline && <AdSense slot="home" />}

        {!isOnline && (
          <section className="mb-5 rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-4">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-600 safari-no-faux-bold">Offline</div>
              <h2 className="text-base sm:text-lg font-semibold text-emerald-900 safari-no-faux-bold">
                {locale === 'ja' ? 'オフライン軽量モード' : locale === 'en' ? 'Offline light mode' : '离线轻量模式'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-emerald-800/80">
                {locale === 'ja'
                  ? '最近表示した問題とおすすめを、画像を減らした軽い表示で使えます。'
                  : locale === 'en'
                    ? 'Recently viewed quizzes and recommendations are available in a lighter, image-reduced view.'
                    : '最近查看过的题目和推荐会以更轻量、减少图片的方式显示。'}
              </p>
            </div>
          </section>
        )}

        {activeStudyRecommendations && (
          <section className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setIsStudyDashboardOpen((open) => !open)}
                className="w-full flex items-center justify-between gap-4 text-left"
                aria-expanded={isStudyDashboardOpen}
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-500 mb-1 safari-no-faux-bold">
                    {activeStudyRecommendations.todayLabel}
                  </div>
                  <h2 className="text-lg sm:text-2xl font-semibold safari-no-faux-bold">{studyText.panelTitle}</h2>
                  {!isStudyDashboardOpen && (
                    <p className="mt-1 text-xs sm:text-sm font-semibold text-zinc-500 line-clamp-1">{studyText.panelBody}</p>
                  )}
                </div>
                <span className="flex-shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-zinc-500 safari-no-faux-bold">
                  {isStudyDashboardOpen ? '閉じる' : '開く'}
                </span>
              </button>

              {isStudyDashboardOpen && (
                <>
                  <p className="text-xs sm:text-sm font-semibold text-zinc-500">{studyText.panelBody}</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded-3xl border border-blue-200/60 bg-blue-50/60 p-4">
                    <div className="text-xs sm:text-sm font-black text-blue-600 mb-2">{studyText.dailyTitle}</div>
                    {dailyQuizzes.length > 0 ? (
                      <div className="space-y-2">
                        {dailyQuizzes.slice(0, 3).map((quiz) => {
                          const qt = quiz.translations[locale] || quiz.translations['ja'];
                          return (
                            <Link key={quiz.id} href={`/watch/${quiz.id}`} className="block rounded-2xl bg-white/80 px-3 py-2.5 font-bold hover:bg-white transition-colors">
                              <div className="line-clamp-2 text-sm"><LatexRenderer text={qt.title} /></div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm font-semibold text-zinc-500">{studyText.noDaily}</div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-red-200/60 bg-red-50/60 p-4">
                    <div className="text-xs sm:text-sm font-black text-red-500 mb-2">{studyText.reviewTitle}</div>
                    {reviewQuizzes.length > 0 ? (
                      <div className="space-y-2">
                        {reviewQuizzes.slice(0, 3).map((quiz) => {
                          const qt = quiz.translations[locale] || quiz.translations['ja'];
                          return (
                            <Link key={quiz.id} href={`/watch/${quiz.id}`} className="block rounded-2xl bg-white/80 px-3 py-2.5 font-bold hover:bg-white transition-colors">
                              <div className="line-clamp-2 text-sm"><LatexRenderer text={qt.title} /></div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm font-semibold text-zinc-500">{studyText.noReview}</div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-amber-200/60 bg-amber-50/60 p-4">
                    <div className="text-xs sm:text-sm font-black text-amber-600 mb-2">{studyText.weaknessTitle}</div>
                    {activeStudyRecommendations.weakCategories.length > 0 ? (
                      <div className="space-y-2">
                        {activeStudyRecommendations.weakCategories.map((category) => (
                          <button
                            key={category.categoryId}
                            onClick={() => {
                              setStudyMode('all');
                              handleCategorySelect(category.categoryId);
                            }}
                            className="w-full text-left rounded-2xl bg-white/80 px-3 py-2.5 hover:bg-white transition-colors"
                          >
                            <div className="font-black text-sm">{category.label}</div>
                            <div className="mt-1 text-[11px] font-bold text-zinc-500">
                              {studyText.weakAccuracy}: {category.accuracy}% · {studyText.weakAttempts}: {category.totalAttempts}
                            </div>
                            <div className="mt-1.5 text-[10px] font-black text-amber-600">{studyText.openCategory}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm font-semibold text-zinc-500">{studyText.noWeakness}</div>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>
          </section>
        )}

        {isOnline ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {displayQuizzes.length > 0 ? (
             displayQuizzes.map((quiz) => {
              const qt = quiz.translations[locale] || quiz.translations['ja'];
              const localeImage = quiz.translations[locale]?.imageUrl || null;
              const jaImage = quiz.translations['ja']?.imageUrl || null;
              const cardImage = (localeImage && localeImage !== "")
                ? localeImage
                : (jaImage && jaImage !== "")
                  ? jaImage
                  : (quiz.imageUrl && quiz.imageUrl !== "")
                    ? quiz.imageUrl
                    : 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop';
              const isDataUri = cardImage.startsWith('data:');
              const translatedCategory = CATEGORY_MAP[locale][quiz.category] || quiz.category;

              return (
                <Link 
                  href={`/watch/${quiz.id}`}
                  key={quiz.id} 
                  className="group min-w-0 cursor-pointer flex flex-col gap-3 overflow-hidden"
                >
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                    {cardImage ? (
                      <Image 
                        key={`${quiz.id}-${locale}-${cardImage}`}
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
                    {(() => {
                      const isNew = new Date().getTime() - new Date(quiz.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000;
                      const hasBookmark = bookmarks.has(quiz.id);
                      return (
                        <>
                          {isNew && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-md border border-white/20 z-10">
                              NEW
                            </div>
                          )}
                          {hasBookmark && (
                            <div 
                              className={`absolute top-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md border border-white/20 ${isNew ? 'left-12' : 'left-2'}`}
                            >
                              ★
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] font-bold leading-snug group-hover:text-amber-500 transition-colors">
                      <LatexRenderer text={qt.title} className="block w-full max-w-full break-words [overflow-wrap:anywhere] sm:line-clamp-2" />
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
        ) : (
          <div className="space-y-3">
            {displayQuizzes.length > 0 ? (
              displayQuizzes.map((quiz) => {
                const qt = quiz.translations[locale] || quiz.translations['ja'];
                const translatedCategory = CATEGORY_MAP[locale][quiz.category] || quiz.category;

                return (
                  <Link
                    href={`/watch/${quiz.id}`}
                    key={quiz.id}
                    className="block rounded-3xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold leading-snug line-clamp-2">
                          <LatexRenderer text={qt.title} />
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600">
                            {translatedCategory}
                          </span>
                          <span className="rounded-full bg-zinc-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            {quiz.targetAge}{t.age}
                          </span>
                          {histories.has(quiz.id) && (
                            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-600">
                              {locale === 'ja' ? 'クリア' : locale === 'en' ? 'Done' : '已完成'}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs font-black text-emerald-600">
                        {locale === 'ja' ? 'オフライン' : locale === 'en' ? 'Offline' : '离线'}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm font-bold text-zinc-500">
                {locale === 'ja'
                  ? 'この端末にはまだオフライン用の問題が保存されていません。オンライン時に数問開くと使えるようになります。'
                  : locale === 'en'
                    ? 'No offline quizzes are stored on this device yet. Open a few quizzes while online to make them available.'
                    : '这台设备上还没有保存离线题目。联网时先打开几道题，就可以离线使用了。'}
              </div>
            )}
          </div>
        )}
      </main>
      <div className="md:pl-72">
        <Footer />
      </div>
    </div>
  );
}
