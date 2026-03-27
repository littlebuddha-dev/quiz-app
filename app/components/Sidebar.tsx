// Path: app/components/Sidebar.tsx
// Title: Navigation Sidebar Component
/* eslint-disable @next/next/no-img-element */
'use client';

import { Locale } from '../types';
import Link from 'next/link';

type SidebarCategory = {
  id: string;
  name?: string;
  ja?: string;
  en?: string;
  zh?: string;
  icon?: string | null;
};

interface SidebarProps {
  locale: Locale;
  categories: SidebarCategory[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  studyMode?: 'all' | 'review' | 'daily';
  onSelectStudyMode?: (mode: 'all' | 'review' | 'daily') => void;
  minAge?: number;
  maxAge?: number;
  onAgeRangeChange?: (min: number, max: number) => void;
}

interface SidebarContentsProps {
  locale: Locale;
  categories: SidebarCategory[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  studyMode?: 'all' | 'review' | 'daily';
  onSelectStudyMode?: (mode: 'all' | 'review' | 'daily') => void;
  isMobile?: boolean;
  minAge?: number;
  maxAge?: number;
  onAgeRangeChange?: (min: number, max: number) => void;
}

const STUDY_MODE_LABELS: Record<Locale, Record<'all' | 'review' | 'daily', string>> = {
  ja: {
    all: '一覧',
    review: '復習',
    daily: '3分',
  },
  en: {
    all: 'All',
    review: 'Retry',
    daily: 'Daily',
  },
  zh: {
    all: '全部',
    review: '复习',
    daily: '每日',
  },
};

export function SidebarContents({
  locale,
  categories,
  activeCategory,
  onSelectCategory,
  studyMode,
  onSelectStudyMode,
  isMobile,
  minAge = 0,
  maxAge = 100,
  onAgeRangeChange
}: SidebarContentsProps) {
  // 年齢スライダーのハンドラ
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxAge - 1);
    onAgeRangeChange?.(value, maxAge);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minAge + 1);
    onAgeRangeChange?.(minAge, value);
  };

  const ageLabel = locale === 'ja' ? '対象年齢' : locale === 'en' ? 'Age Range' : '年龄范围';

  const rangeSlider = onAgeRangeChange ? (
    <div className={`${isMobile ? 'mb-2' : 'mb-8'} p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 w-full`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <img src="/icons/list.svg" alt="" className="w-3.5 h-3.5 opacity-50 grayscale" />
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{ageLabel}</span>
        </div>
        <span className="text-xs font-black text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded-lg border border-amber-200/50">
          {minAge} - {maxAge === 100 ? '100+' : maxAge}
        </span>
      </div>
      <div className="relative h-6 flex items-center px-1">
        {/* 背景トラック */}
        <div className="absolute left-1 right-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
        {/* 選択範囲ハイライト */}
        <div 
          className="absolute h-1.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-300"
          style={{ 
            left: `${minAge + 1}%`, 
            right: `${100 - maxAge + 1}%` 
          }}
        />
        {/* デュアルスライダー（透明なトラック、見えるツマミ） */}
        <input
          type="range"
          min="0"
          max="100"
          value={minAge}
          onChange={handleMinChange}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          className="absolute w-full h-1.5 bg-transparent pointer-events-none z-30 
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-125"
        />
        <input
          type="range"
          min="0"
          max="100"
          value={maxAge}
          onChange={handleMaxChange}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          className="absolute w-full h-1.5 bg-transparent pointer-events-none z-40 
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-125"
        />
      </div>
    </div>
  ) : null;
  // 「すべて」を追加
  const allCategories = [
    { id: 'すべて', ja: 'すべて', en: 'All', zh: '全部', icon: 'all.svg' },
    ...categories
  ];

  const studyModeButtons = onSelectStudyMode && studyMode ? (
    <div className={`${isMobile ? 'flex gap-2 overflow-x-auto no-scrollbar pb-1' : 'grid grid-cols-3 gap-2 mb-3 px-1'}`}>
      {(['all', 'review', 'daily'] as const).map((mode) => {
        const isActive = studyMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onSelectStudyMode(mode)}
            className={`rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 safari-no-faux-bold ${
              isMobile
                ? `px-4 py-2 text-xs whitespace-nowrap flex-shrink-0 ${isActive ? 'bg-zinc-900 text-white shadow-md' : 'border border-[var(--border)] bg-[var(--card)] text-zinc-500'}`
                : `px-1 py-2 text-[11px] ${isActive ? 'bg-zinc-900 text-white shadow-md' : 'border border-[var(--border)] text-zinc-500 hover:text-zinc-900'}`
            }`}
          >
            <img 
              src={`/icons/${mode === 'all' ? 'list' : mode === 'review' ? 'review' : 'daily'}.svg`} 
              alt="" 
              className={`w-3.5 h-3.5 transition-colors ${isActive ? 'brightness-0 invert' : 'opacity-60 grayscale'}`} 
            />
            {STUDY_MODE_LABELS[locale][mode]}
          </button>
        );
      })}
    </div>
  ) : null;

  const categoryButtons = allCategories.map((cat) => {
    const label = cat[locale] || cat.name || cat.ja;
    const isActive = activeCategory === cat.id;

    return (
      <button
        key={cat.id}
        onClick={() => onSelectCategory(cat.id)}
        className={`flex items-center gap-3 text-left rounded-xl font-bold transition-all ${
          isActive
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95'
            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'
        } ${isMobile ? 'py-2 px-4 text-sm whitespace-nowrap flex-shrink-0 bg-[var(--card)] border border-[var(--border)]' : 'px-4 py-2'}`}
      >
        {cat.icon ? (
          <img
            src={`/icons/${cat.icon}`}
            alt=""
            className={`w-5 h-5 transition-colors ${isActive ? 'brightness-0 invert' : 'opacity-60 grayscale'}`}
          />
        ) : (
          <div className="w-5 h-5 flex-shrink-0" />
        )}
        <span className={isMobile ? '' : 'truncate'}>{label}</span>
      </button>
    );
  });

  const gameModeLink = (
    <Link
      href="/game"
      className={`flex items-center gap-3 text-left rounded-xl font-bold transition-all text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)] ${isMobile ? 'py-2 px-4 text-sm whitespace-nowrap flex-shrink-0 bg-[var(--card)] border border-[var(--border)]' : 'px-4 py-2 mb-2'}`}
    >
      <img
        src="/icons/timer.svg"
        alt=""
        className="w-5 h-5 transition-colors opacity-60 grayscale"
      />
      <span className={isMobile ? '' : 'truncate'}>{locale === 'ja' ? 'タイムアタック' : locale === 'en' ? 'Time Attack' : '计时挑战'}</span>
    </Link>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        {/* スライダーだけの段（幅いっぱいに表示） */}
        <div className="w-full">
          {rangeSlider}
        </div>
        
        {/* ボタンの段 */}
        <div className="w-full">
          {studyModeButtons}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {gameModeLink}
          {/* 区切り線 (モバイル) */}
          <div className="w-px h-6 bg-[var(--border)] self-center flex-shrink-0" />
          {categoryButtons}
        </div>
      </div>
    );
  }

  return (
    <>
      {rangeSlider}
      {studyModeButtons}
      {gameModeLink}
      {/* 区切り線 (デスクトップ) */}
      <div className="h-px bg-[var(--border)] my-2 mx-1" />
      {categoryButtons}
    </>
  );
}

export default function Sidebar({
  locale,
  categories,
  activeCategory,
  onSelectCategory,
  studyMode,
  onSelectStudyMode,
  minAge,
  maxAge,
  onAgeRangeChange
}: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] fixed left-0 top-[var(--header-height)] overflow-y-auto hidden md:block transition-colors">
      <div className="p-4 flex flex-col gap-1">
        <SidebarContents
          locale={locale}
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
          studyMode={studyMode}
          onSelectStudyMode={onSelectStudyMode}
          minAge={minAge}
          maxAge={maxAge}
          onAgeRangeChange={onAgeRangeChange}
        />
      </div>
    </aside>
  );
}
