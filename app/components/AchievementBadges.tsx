// Path: app/components/AchievementBadges.tsx
// Title: Achievement Badges Display Component
// Purpose: ホーム画面に実績バッジを表示するコンポーネント

'use client';

import { useState } from 'react';
import { Achievement } from '@/lib/achievements';
import { Locale } from '../types';

interface AchievementBadgesProps {
  achievements: Achievement[];
  locale: Locale;
}

const DICTIONARY: Record<Locale, { title: string; unlocked: string; locked: string; progress: string }> = {
  ja: { title: '実績バッジ', unlocked: '解除済み', locked: '未解除', progress: '進捗' },
  en: { title: 'Achievements', unlocked: 'Unlocked', locked: 'Locked', progress: 'Progress' },
  zh: { title: '成就徽章', unlocked: '已解锁', locked: '未解锁', progress: '进度' },
};

export default function AchievementBadges({ achievements, locale }: AchievementBadgesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = DICTIONARY[locale];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  // 先にアンロック済みを表示、その後未アンロックをprogress順で
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return (b.progress ?? 0) - (a.progress ?? 0);
  });

  return (
    <section className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-1">
            {unlockedCount}/{totalCount}
          </div>
          <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2">
            🏅 {t.title}
          </h2>
          {!isOpen && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sorted.filter((a) => a.unlocked).slice(0, 6).map((a) => (
                <span key={a.id} className="text-xl" title={a.label[locale]}>{a.icon}</span>
              ))}
              {unlockedCount > 6 && (
                <span className="text-xs font-black text-zinc-400 self-center">+{unlockedCount - 6}</span>
              )}
            </div>
          )}
        </div>
        <span className="flex-shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-black text-zinc-500">
          {isOpen ? (locale === 'ja' ? '閉じる' : locale === 'en' ? 'Close' : '关闭') : (locale === 'ja' ? '開く' : locale === 'en' ? 'Open' : '打开')}
        </span>
      </button>

      {isOpen && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-4 text-center transition-all ${
                badge.unlocked
                  ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40'
                  : 'border-[var(--border)] bg-[var(--background)] opacity-50'
              }`}
            >
              <div className={`text-3xl mb-2 ${badge.unlocked ? '' : 'grayscale'}`}>
                {badge.icon}
              </div>
              <div className="font-black text-xs mb-1">{badge.label[locale]}</div>
              <div className="text-[10px] text-zinc-500 font-semibold leading-snug">
                {badge.description[locale]}
              </div>
              {!badge.unlocked && badge.progress !== undefined && badge.progress > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                  <div className="text-[9px] font-bold text-zinc-400 mt-1">{badge.progress}%</div>
                </div>
              )}
              {badge.unlocked && (
                <div className="mt-2 text-[9px] font-black text-amber-600 uppercase tracking-wider">
                  ✓ {t.unlocked}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
