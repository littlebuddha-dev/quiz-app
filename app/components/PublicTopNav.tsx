import Link from 'next/link';
import type { Locale } from '@/app/types';

type PublicTopNavProps = {
  locale: Locale;
};

const DICTIONARY: Record<
  Locale,
  {
    home: string;
    new: string;
    popular: string;
    courses: string;
    ranking: string;
    analysis: string;
  }
> = {
  ja: {
    home: 'ホーム',
    new: '新着',
    popular: '人気',
    courses: 'コース',
    ranking: 'ランキング',
    analysis: '分析',
  },
  en: {
    home: 'Home',
    new: 'New',
    popular: 'Popular',
    courses: 'Courses',
    ranking: 'Ranking',
    analysis: 'Analysis',
  },
  zh: {
    home: '首页',
    new: '最新',
    popular: '热门',
    courses: '课程',
    ranking: '排行榜',
    analysis: '分析',
  },
};

export default function PublicTopNav({ locale }: PublicTopNavProps) {
  const t = DICTIONARY[locale];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img
            src="/logo-header.svg"
            alt="Cue Logo"
            className="h-8 w-24 object-contain"
          />
        </Link>

        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link href="/" className="rounded-full px-3 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600">
            {t.home}
          </Link>
          <Link href="/new" className="rounded-full px-3 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600">
            {t.new}
          </Link>
          <Link href="/popular" className="rounded-full px-3 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600">
            {t.popular}
          </Link>
          <Link href="/courses" className="rounded-full px-3 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600">
            {t.courses}
          </Link>
          <Link href="/ranking" className="rounded-full px-3 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600">
            {t.ranking}
          </Link>
          <Link href="/analysis" className="rounded-full px-3 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-600">
            {t.analysis}
          </Link>
        </nav>
      </div>
    </header>
  );
}
