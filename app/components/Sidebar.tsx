// Path: app/components/Sidebar.tsx
// Title: Navigation Sidebar Component
'use client';

import { Locale } from '../types';

interface SidebarProps {
  locale: Locale;
  categories: any[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

interface SidebarContentsProps {
  locale: Locale;
  categories: any[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  isMobile?: boolean;
}

export function SidebarContents({ locale, categories, activeCategory, onSelectCategory, isMobile }: SidebarContentsProps) {
  // 「すべて」を追加
  const allCategories = [
    { id: 'すべて', ja: 'すべて', en: 'All', zh: '全部' },
    ...categories
  ];

  return (
    <>
      {allCategories.map((cat) => {
        const label = cat[locale] || cat.name || cat.ja;
        const isActive = activeCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`text-left px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
              isActive
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'
            } ${isMobile ? 'py-2 px-4 text-sm' : ''}`}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}

export default function Sidebar({ locale, categories, activeCategory, onSelectCategory }: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] fixed left-0 top-16 overflow-y-auto hidden md:block transition-colors">
      <div className="p-4 flex flex-col gap-1.5">
        <SidebarContents locale={locale} categories={categories} activeCategory={activeCategory} onSelectCategory={onSelectCategory} />
      </div>
    </aside>
  );
}