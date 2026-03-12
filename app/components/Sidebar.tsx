// Path: app/components/Sidebar.tsx
// Title: Navigation Sidebar Component
// Purpose: Displays the category filters like YouTube's left menu, with multi-language support.

'use client';

import { Locale } from '../types';

interface SidebarProps {
  locale: Locale;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = {
  ja: ['すべて', '国語', '算数', '理科', '社会', '家庭科', '一般'],
  en: ['All', 'Japanese', 'Math', 'Science', 'Social Studies', 'Home Economics', 'General'],
  zh: ['全部', '语文', '数学', '科学', '社会', '家政', '一般'],
};

export default function Sidebar({ locale, activeCategory, onSelectCategory }: SidebarProps) {
  const currentCategories = CATEGORIES[locale];

  return (
    <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] fixed left-0 top-16 overflow-y-auto hidden md:block transition-colors">
      <div className="p-4 flex flex-col gap-1.5">
        {currentCategories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`text-left px-5 py-3 rounded-xl font-bold transition-all ${
              (activeCategory === category || (activeCategory === 'All' && category === 'すべて'))
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </aside>
  );
}