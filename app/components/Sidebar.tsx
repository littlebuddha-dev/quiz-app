// Path: app/components/Sidebar.tsx
// Title: Navigation Sidebar Component
/* eslint-disable @next/next/no-img-element */
'use client';

import { Locale } from '../types';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
  isAdminMode?: boolean;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onCategoriesReordered?: (categories: SidebarCategory[]) => void;
  studyMode?: 'all' | 'review' | 'daily' | 'mission';
  onSelectStudyMode?: (mode: 'all' | 'review' | 'daily' | 'mission') => void;
  minAge?: number;
  maxAge?: number;
  onAgeRangeChange?: (min: number, max: number) => void;
}

interface SidebarContentsProps {
  locale: Locale;
  categories: SidebarCategory[];
  isAdminMode?: boolean;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onCategoriesReordered?: (categories: SidebarCategory[]) => void;
  studyMode?: 'all' | 'review' | 'daily' | 'mission';
  onSelectStudyMode?: (mode: 'all' | 'review' | 'daily' | 'mission') => void;
  isMobile?: boolean;
  minAge?: number;
  maxAge?: number;
  onAgeRangeChange?: (min: number, max: number) => void;
}

const AGE_GROUPS = [
  { key: 'all', min: 0, max: 100, icon: 'all.svg', label: { ja: 'すべて', en: 'All', zh: '全部' }, rangeLabel: { ja: '全年齢', en: 'All ages', zh: '全部年龄' } },
  { key: 'preschool', min: 0, max: 6, icon: 'star.svg', label: { ja: '幼児', en: 'Preschool', zh: '幼儿' }, rangeLabel: { ja: '0〜6歳', en: 'Ages 0-6', zh: '0-6岁' } },
  { key: 'elementary-lower', min: 6, max: 9, icon: 'math.svg', label: { ja: '小学校低学年', en: 'Elementary 1-3', zh: '小学低年级' }, rangeLabel: { ja: '6〜9歳', en: 'Ages 6-9', zh: '6-9岁' } },
  { key: 'elementary-upper', min: 10, max: 12, icon: 'science.svg', label: { ja: '小学校高学年', en: 'Elementary 4-6', zh: '小学高年级' }, rangeLabel: { ja: '10〜12歳', en: 'Ages 10-12', zh: '10-12岁' } },
  { key: 'middle-school', min: 13, max: 15, icon: 'social.svg', label: { ja: '中学生', en: 'Middle School', zh: '初中生' }, rangeLabel: { ja: '13〜15歳', en: 'Ages 13-15', zh: '13-15岁' } },
  { key: 'high-school', min: 16, max: 18, icon: 'logic.svg', label: { ja: '高校生', en: 'High School', zh: '高中生' }, rangeLabel: { ja: '16〜18歳', en: 'Ages 16-18', zh: '16-18岁' } },
  { key: 'university', min: 18, max: 22, icon: 'course.svg', label: { ja: '大学生', en: 'University', zh: '大学生' }, rangeLabel: { ja: '18〜22歳', en: 'Ages 18-22', zh: '18-22岁' } },
  { key: 'adult', min: 18, max: 100, icon: 'users.svg', label: { ja: '大人', en: 'Adults', zh: '成人' }, rangeLabel: { ja: '18歳以上', en: '18 and older', zh: '18岁以上' } },
] as const;

const STUDY_MODE_LABELS: Record<Locale, Record<'all' | 'review' | 'daily' | 'mission', string>> = {
  ja: {
    all: '一覧',
    review: '復習',
    daily: '3分',
    mission: '克服',
  },
  en: {
    all: 'All',
    review: 'Retry',
    daily: 'Daily',
    mission: 'Mission',
  },
  zh: {
    all: '全部',
    review: '复习',
    daily: '每日',
    mission: '攻克',
  },
};

export function SidebarContents({
  locale,
  categories,
  isAdminMode = false,
  activeCategory,
  onSelectCategory,
  onCategoriesReordered,
  studyMode,
  onSelectStudyMode,
  isMobile,
  minAge = 0,
  maxAge = 100,
  onAgeRangeChange
}: SidebarContentsProps) {
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const ageLabel = locale === 'ja' ? '対象年齢' : locale === 'en' ? 'Target Age' : '对象年龄';
  const activeAgeGroup = AGE_GROUPS.find((group) => group.min === minAge && group.max === maxAge);

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const canReorder = isAdminMode && !isMobile;

  const reorderCategories = (items: SidebarCategory[], sourceId: string, targetId: string) => {
    if (sourceId === targetId) return items;
    const next = [...items];
    const sourceIndex = next.findIndex((item) => item.id === sourceId);
    const targetIndex = next.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return items;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  };

  const persistCategoryOrder = async (nextCategories: SidebarCategory[]) => {
    if (!canReorder) return;
    setIsSavingOrder(true);
    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: nextCategories.map((category, index) => ({
            id: category.id,
            sortOrder: index,
          })),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to reorder categories');
      }
      onCategoriesReordered?.(nextCategories);
    } catch (error) {
      console.error('Failed to reorder sidebar categories:', error);
      setOrderedCategories(categories);
      alert(locale === 'ja' ? '並び替えの保存に失敗しました。' : locale === 'en' ? 'Failed to save category order.' : '保存分类顺序失败。');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const ageGroupSelector = onAgeRangeChange ? (
    <div className={`${isMobile ? 'mb-2' : 'mb-8'} p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 w-full`}>
      <div className="flex justify-between items-center mb-3 gap-3">
        <div className="flex items-center gap-2">
          <img src="/icons/list.svg" alt="" className="w-3.5 h-3.5 opacity-50 grayscale" />
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{ageLabel}</span>
        </div>
        <span className="text-[10px] sm:text-xs font-black text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded-lg border border-amber-200/50 whitespace-nowrap">
          {activeAgeGroup ? activeAgeGroup.label[locale] : `${minAge}-${maxAge === 100 ? '100+' : maxAge}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {AGE_GROUPS.map((group) => {
          const isActive = group.min === minAge && group.max === maxAge;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onAgeRangeChange(group.min, group.max)}
              title={`${group.label[locale]} (${group.rangeLabel[locale]})`}
              className={`group relative rounded-xl px-2.5 py-2 text-left text-[10px] font-black transition-all ${
                isActive
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-white dark:bg-zinc-900 border border-[var(--border)] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <img
                  src={`/icons/${group.icon}`}
                  alt=""
                  className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'brightness-0 invert' : 'opacity-60 grayscale'}`}
                />
                <span className="leading-tight break-words">{group.label[locale]}</span>
              </div>
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 md:block">
                {group.rangeLabel[locale]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;
  // 「すべて」を追加
  const allCategories = useMemo(() => [
    { id: 'すべて', ja: 'すべて', en: 'All', zh: '全部', icon: 'all.svg' },
    ...orderedCategories
  ], [orderedCategories]);

  const studyModeButtons = onSelectStudyMode && studyMode ? (
    <div className={`${isMobile ? 'flex gap-2 overflow-x-auto no-scrollbar pb-1' : 'grid grid-cols-3 gap-2 mb-3 px-1'}`}>
      {(['all', 'review', 'daily', 'mission'] as const).map((mode) => {
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
              src={`/icons/${mode === 'all' ? 'list' : mode === 'review' ? 'review' : mode === 'daily' ? 'daily' : 'target'}.svg`} 
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
        draggable={canReorder && cat.id !== 'すべて'}
        onDragStart={() => {
          if (!canReorder || cat.id === 'すべて') return;
          setDraggedId(cat.id);
        }}
        onDragOver={(event) => {
          if (!canReorder || cat.id === 'すべて') return;
          event.preventDefault();
          setDropTargetId(cat.id);
        }}
        onDrop={(event) => {
          if (!canReorder || !draggedId || cat.id === 'すべて') return;
          event.preventDefault();
          const next = reorderCategories(orderedCategories, draggedId, cat.id);
          setOrderedCategories(next);
          setDraggedId(null);
          setDropTargetId(null);
          void persistCategoryOrder(next);
        }}
        onDragEnd={() => {
          setDraggedId(null);
          setDropTargetId(null);
        }}
        className={`flex items-center gap-3 text-left rounded-xl font-bold transition-all ${
          isActive
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-95'
            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'
        } ${canReorder && cat.id !== 'すべて' ? 'cursor-grab active:cursor-grabbing' : ''} ${
          canReorder && dropTargetId === cat.id ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent' : ''
        } ${isMobile ? 'py-2 px-4 text-sm whitespace-nowrap flex-shrink-0 bg-[var(--card)] border border-[var(--border)]' : 'px-4 py-2'}`}
      >
        {canReorder && cat.id !== 'すべて' && (
          <span className={`text-zinc-400 ${isActive ? 'text-white/80' : ''}`} aria-hidden="true">
            ⋮⋮
          </span>
        )}
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
          {ageGroupSelector}
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
      {ageGroupSelector}
      {studyModeButtons}
      {gameModeLink}
      {canReorder && (
        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
          {isSavingOrder
            ? (locale === 'ja' ? '並び順を保存中' : locale === 'en' ? 'Saving order' : '正在保存顺序')
            : (locale === 'ja' ? 'ドラッグで並び替え' : locale === 'en' ? 'Drag to reorder' : '拖动排序')}
        </div>
      )}
      {/* 区切り線 (デスクトップ) */}
      <div className="h-px bg-[var(--border)] my-2 mx-1" />
      {categoryButtons}
    </>
  );
}

export default function Sidebar({
  locale,
  categories,
  isAdminMode = false,
  activeCategory,
  onSelectCategory,
  onCategoriesReordered,
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
          isAdminMode={isAdminMode}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
          onCategoriesReordered={onCategoriesReordered}
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
