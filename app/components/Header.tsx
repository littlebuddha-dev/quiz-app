// Path: app/components/Header.tsx
// Title: Shared Header Component
// Purpose: Reusable header with search, language selector, and user status.
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Locale } from '../types';

const DICTIONARY: Record<Locale, { search: string; ranking: string; courses: string; analysis: string; login: string; }> = {
  ja: { search: '検索...', ranking: 'ランキング', courses: 'コース', analysis: '分析', login: 'ログイン' },
  en: { search: 'Search...', ranking: 'Ranking', courses: 'Courses', analysis: 'Analysis', login: 'Log in' },
  zh: { search: '搜索...', ranking: '排行榜', courses: '课程', analysis: '分析', login: '登录' },
};

type HeaderProps = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  searchQuery?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userStatus?: { xp: number; level: number; role: string };
  hideSearch?: boolean;
}

export default function Header({
  locale,
  setLocale,
  searchQuery = '',
  onSearchChange,
  userStatus,
  hideSearch = false
}: HeaderProps) {
  const t = DICTIONARY[locale];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--card)]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 border-b border-[var(--border)] z-50 transition-colors" suppressHydrationWarning>
      <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-24 sm:h-9 sm:w-28">
            <img
              src="/logo-header.svg"
              alt="Cue Logo"
              className="h-full w-full object-contain"
            />
          </div>
        </Link>
      </div>

      {!hideSearch && (
        <div className="flex-1 max-w-2xl px-2 sm:px-6">
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full border border-[var(--border)] rounded-full px-4 sm:px-6 py-1.5 sm:py-2 bg-[var(--background)] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/20 transition-all text-[var(--foreground)] text-sm sm:text-base"
          />
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {userStatus && (
          <div className="hidden lg:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Level</span>
              <span className="text-sm font-black text-amber-500">{userStatus.level}</span>
            </div>
            <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                style={{ width: `${(userStatus.xp / (userStatus.level * 100)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Link href="/ranking" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100">
          <img src="/icons/ranking.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
          <span className="hidden md:block">{t.ranking}</span>
        </Link>

        <Link href="/courses" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100">
          <img src="/icons/course.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
          <span className="hidden md:block">{t.courses}</span>
        </Link>

        <Link href="/analysis" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100">
          <img src="/icons/analysis.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
          <span className="hidden md:block">{t.analysis}</span>
        </Link>

        <div className="flex items-center">
          {mounted ? (
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="border-none bg-transparent text-zinc-500 font-bold cursor-pointer focus:outline-none text-xs sm:text-sm appearance-none pr-1"
            >
              <option value="ja">JP</option>
              <option value="en">EN</option>
              <option value="zh">ZH</option>
            </select>
          ) : (
            <div className="text-zinc-500 font-bold text-xs sm:text-sm pr-1">JP</div>
          )}
          <span className="text-zinc-300 dark:text-zinc-700 text-xs hidden sm:inline px-1">|</span>
        </div>

        {mounted ? (
          <>
            <SignedOut>
              <SignInButton mode="modal">
                <button type="button" className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 sm:py-2 px-3 sm:px-6 rounded-full text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 whitespace-nowrap">
                  {t.login}
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 sm:w-9 sm:h-9 border-2 border-amber-400 shadow-sm" } }}>
                {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="管理者ダッシュボード"
                      labelIcon={<img src="/icons/dashboard.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                      href="/admin"
                    />
                    <UserButton.Link
                      label="ユーザー管理"
                      labelIcon={<img src="/icons/users.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                      href="/admin/users"
                    />
                    <UserButton.Link
                      label="Google AdSense"
                      labelIcon={<img src="/icons/ad.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                      href="/admin/adsense"
                    />
                  </UserButton.MenuItems>
                )}
              </UserButton>
            </SignedIn>
          </>
        ) : (
          <div className="h-8 w-20 sm:w-24 rounded-full bg-zinc-100/80 border border-[var(--border)]" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
