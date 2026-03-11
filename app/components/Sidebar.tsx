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
    <aside className="w-64 h-screen bg-white border-r border-zinc-200 fixed left-0 top-16 overflow-y-auto hidden md:block">
      <div className="p-4 flex flex-col gap-2">
        {currentCategories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`text-left px-4 py-3 rounded-lg font-bold transition-colors ${
              (activeCategory === category || (activeCategory === 'All' && category === 'すべて'))
                ? 'bg-amber-100 text-amber-900'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </aside>
  );
}