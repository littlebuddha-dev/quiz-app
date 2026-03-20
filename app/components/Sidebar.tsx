// Path: app/components/Sidebar.tsx
// Title: Navigation Sidebar Component
/* eslint-disable @next/next/no-img-element */
'use client';

import { Locale } from '../types';

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
}

interface SidebarContentsProps {
  locale: Locale;
  categories: SidebarCategory[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  studyMode?: 'all' | 'review' | 'daily';
  onSelectStudyMode?: (mode: 'all' | 'review' | 'daily') => void;
  isMobile?: boolean;
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
  isMobile
}: SidebarContentsProps) {
  // 「すべて」を追加
  const allCategories = [
    { id: 'すべて', ja: 'すべて', en: 'All', zh: '全部' },
    ...categories
  ];

  return (
    <>
      {onSelectStudyMode && studyMode && (
        <div className={`${isMobile ? 'flex gap-2 mb-1' : 'grid grid-cols-3 gap-2 mb-3 px-1'}`}>
          {(['all', 'review', 'daily'] as const).map((mode) => {
            const isActive = studyMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onSelectStudyMode(mode)}
                className={`rounded-xl font-black transition-all ${
                  isMobile
                    ? `px-3 py-1.5 text-xs whitespace-nowrap ${isActive ? 'bg-zinc-900 text-white shadow-md' : 'border border-[var(--border)] text-zinc-500'}`
                    : `px-2 py-2 text-[11px] ${isActive ? 'bg-zinc-900 text-white shadow-md' : 'border border-[var(--border)] text-zinc-500 hover:text-zinc-900'}`
                }`}
              >
                {STUDY_MODE_LABELS[locale][mode]}
              </button>
            );
          })}
        </div>
      )}

      {allCategories.map((cat) => {
        const label = cat[locale] || cat.name || cat.ja;
        const isActive = activeCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-3 text-left px-5 py-3 rounded-xl font-bold transition-all ${
              isActive
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'
            } ${isMobile ? 'py-2 px-4 text-sm' : ''}`}
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
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </>
  );
}

export default function Sidebar({
  locale,
  categories,
  activeCategory,
  onSelectCategory,
  studyMode,
  onSelectStudyMode
}: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] fixed left-0 top-16 overflow-y-auto hidden md:block transition-colors">
      <div className="p-4 flex flex-col gap-1.5">
        <SidebarContents
          locale={locale}
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
          studyMode={studyMode}
          onSelectStudyMode={onSelectStudyMode}
        />
      </div>
    </aside>
  );
}
