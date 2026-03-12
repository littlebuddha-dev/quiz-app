// Path: app/components/Header.tsx
// Title: Shared Header Component
// Purpose: Reusable header with search, language selector, and user status.
'use client';

import Image from 'next/image';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Locale } from '../types';

const DICTIONARY: Record<Locale, { search: string; }> = {
  ja: { search: '検索...' },
  en: { search: 'Search...' },
  zh: { search: '搜索...' },
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

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--card)]/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-[var(--border)] z-50 transition-colors">
      <div className="flex items-center gap-2">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/20">Q</div>
          <span className="text-xl font-black tracking-tight hidden sm:block">NanoQuizTube</span>
        </a>
      </div>
      
      {!hideSearch && (
        <div className="flex-1 max-w-2xl px-6">
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full border border-[var(--border)] rounded-full px-6 py-2 bg-[var(--background)] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/20 transition-all text-[var(--foreground)]"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
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

        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="border-none bg-transparent text-zinc-500 font-bold cursor-pointer focus:outline-none text-sm"
        >
          <option value="ja">JP</option>
          <option value="en">EN</option>
          <option value="zh">ZH</option>
        </select>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-full text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95">
              ログイン
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-9 h-9 border-2 border-amber-400 shadow-sm" } }}>
            {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
              <UserButton.MenuItems>
                <UserButton.Link
                  label="管理者ダッシュボード"
                  labelIcon={<div className="w-4 h-4 bg-amber-500 rounded flex items-center justify-center text-[10px] text-white font-bold">A</div>}
                  href="/admin"
                />
              </UserButton.MenuItems>
            )}
          </UserButton>
        </SignedIn>
      </div>
    </header>
  );
}
