// Path: app/components/Header.tsx
// Title: Shared Header Component
// Purpose: Reusable header with search, language selector, and user status.
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef } from 'react';
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const multiSessionEnabled =
    process.env.NEXT_PUBLIC_CLERK_MULTI_SESSION_ENABLED === 'true';

  const { userId } = useAuth();
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(userStatus);
  const [currentLocation, setCurrentLocation] = useState('');

  // プロップが更新されたらローカルステートを同期
  useEffect(() => {
    if (userStatus) {
      setCurrentStatus(userStatus);
    }
  }, [userStatus]);

  // URL情報の同期 (hydrationを考慮)
  useEffect(() => {
    if (mounted) {
      const sp = searchParams?.toString();
      setCurrentLocation(`${pathname}${sp ? `?${sp}` : ''}`);
    }
  }, [mounted, pathname, searchParams]);

  // クライアントサイドでの最新ステータス取得 (同期漏れ対策)
  useEffect(() => {
    if (!mounted || !userId || userStatus) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/user/status');
        if (res.ok) {
          const data = (await res.json()) as { xp: number; level: number; role: string };
          setCurrentStatus(data);
        } else {
          console.warn('User status fetch non-ok:', res.status);
        }
      } catch (err) {
        console.warn('Failed to fetch user status:', err);
      }
    };

    fetchStatus();
  }, [userId, mounted, userStatus]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prevUserId = useRef<string | null | undefined>(undefined);

  // セッション状態の変化に伴う再取得ロジックを一旦停止 (React 19 の router.refresh 競合回避)
  useEffect(() => {
    prevUserId.current = userId;
  }, [userId]);

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);
    router.refresh();
  };

  const authSkeleton = (
    <div className="h-8 w-20 sm:w-24 rounded-full bg-zinc-100/80 border border-[var(--border)]" aria-hidden="true" />
  );
  
  const addAccountHref = `/sign-in?redirect_url=${encodeURIComponent(currentLocation || '/')}`;
  const userButtonProps = multiSessionEnabled
    ? {
        signInUrl: addAccountHref,
        afterSwitchSessionUrl: currentLocation || '/',
      }
    : {};

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-md px-4 py-3 sm:h-16 sm:px-6 sm:py-0 border-b border-[var(--border)] z-50 transition-colors overflow-x-hidden"
      suppressHydrationWarning
    >
      <div className="flex flex-col gap-3 sm:hidden w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-2 flex-shrink-0 transition-transform active:scale-95 md:hover:opacity-80 p-1 -m-1"
          >
            <div className="h-8 w-24">
              <img
                src="/logo-header.svg"
                alt="Cue Logo"
                className="h-full w-full object-contain pointer-events-none"
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center">
              {mounted ? (
                <select
                  value={locale}
                  onChange={(e) => handleLocaleChange(e.target.value as Locale)}
                  className="border-none bg-transparent text-zinc-500 font-bold cursor-pointer focus:outline-none text-xs appearance-none pr-1"
                >
                  <option value="ja">JP</option>
                  <option value="en">EN</option>
                  <option value="zh">ZH</option>
                </select>
              ) : (
                <div className="text-zinc-500 font-bold text-xs pr-1">JP</div>
              )}
            </div>

            {mounted ? (
              <>
                <ClerkLoading>{authSkeleton}</ClerkLoading>
                <ClerkLoaded>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button type="button" className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 px-3 rounded-full text-xs transition-all shadow-lg shadow-amber-500/20 md:hover:scale-105 active:scale-95 whitespace-nowrap safari-no-faux-bold">
                        {t.login}
                      </button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton
                      {...userButtonProps}
                      appearance={{ elements: { avatarBox: "w-8 h-8 border-2 border-amber-400 shadow-sm" } }}
                    >
                      <UserButton.MenuItems>
                        <UserButton.Link
                          label="プロフィール設定"
                          labelIcon={<img src="/icons/course.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/onboarding"
                        />
                        {(currentStatus?.role === 'ADMIN' || currentStatus?.role === 'PARENT') && (
                          <UserButton.Link
                            label="管理者ダッシュボード"
                            labelIcon={<img src="/icons/dashboard.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                            href="/admin"
                          />
                        )}
                        {(currentStatus?.role === 'ADMIN' || currentStatus?.role === 'PARENT') && (
                          <UserButton.Link
                            label="ユーザー管理"
                            labelIcon={<img src="/icons/users.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                            href="/admin/users"
                          />
                        )}
                        {(currentStatus?.role === 'ADMIN' || currentStatus?.role === 'PARENT') && (
                          <UserButton.Link
                            label="Google AdSense"
                            labelIcon={<img src="/icons/ad.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                            href="/admin/adsense"
                          />
                        )}
                      </UserButton.MenuItems>
                    </UserButton>
                  </SignedIn>
                </ClerkLoaded>
              </>
            ) : (
              authSkeleton
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {currentStatus && (
            <div className="flex-shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-center min-w-[4.5rem]">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Level</div>
              <div className="text-sm font-semibold text-amber-500 safari-no-faux-bold">{currentStatus.level}</div>
            </div>
          )}

          <Link href="/ranking" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 whitespace-nowrap flex-shrink-0">
            <img src="/icons/ranking.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
            <span className="text-xs font-medium safari-no-faux-bold break-words [overflow-wrap:anywhere]">{t.ranking}</span>
          </Link>

          <Link href="/courses" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 whitespace-nowrap flex-shrink-0">
            <img src="/icons/course.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
            <span className="text-xs font-medium safari-no-faux-bold break-words [overflow-wrap:anywhere]">{t.courses}</span>
          </Link>

          <Link href="/analysis" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100 whitespace-nowrap flex-shrink-0">
            <img src="/icons/analysis.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
            <span className="text-xs font-medium safari-no-faux-bold break-words [overflow-wrap:anywhere]">{t.analysis}</span>
          </Link>
        </div>

        {!hideSearch && (
          <div className="w-full">
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={onSearchChange}
              className="w-full border border-[var(--border)] rounded-full px-4 py-2 bg-[var(--background)] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/20 transition-all text-[var(--foreground)] text-sm"
            />
          </div>
        )}
      </div>

      <div className="hidden sm:flex sm:h-full sm:items-center sm:justify-between sm:gap-0">
        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <Link 
            href="/" 
            className="flex items-center gap-2 transition-transform active:scale-95 md:hover:opacity-80 p-1 -m-1"
          >
            <div className="h-8 w-24 sm:h-9 sm:w-28">
              <img
                src="/logo-header.svg"
                alt="Cue Logo"
                className="h-full w-full object-contain pointer-events-none"
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
              className="w-full border border-[var(--border)] rounded-full px-4 sm:px-6 py-2 bg-[var(--background)] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/20 transition-all text-[var(--foreground)] text-sm sm:text-base"
            />
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {currentStatus && (
            <div className="hidden lg:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Level</span>
                <span className="text-sm font-semibold text-amber-500 safari-no-faux-bold">{currentStatus.level}</span>
              </div>
              <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${(currentStatus.xp / (currentStatus.level * 100)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Link href="/ranking" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100">
            <img src="/icons/ranking.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
            <span className="hidden md:block font-medium safari-no-faux-bold">{t.ranking}</span>
          </Link>

          <Link href="/courses" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100">
            <img src="/icons/course.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
            <span className="hidden md:block font-medium safari-no-faux-bold">{t.courses}</span>
          </Link>

          <Link href="/analysis" className="text-sm font-bold text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-100">
            <img src="/icons/analysis.svg" alt="" className="w-5 h-5 opacity-70 grayscale" />
            <span className="hidden md:block font-medium safari-no-faux-bold">{t.analysis}</span>
          </Link>

          <div className="flex items-center">
            {mounted ? (
              <select
                value={locale}
                onChange={(e) => handleLocaleChange(e.target.value as Locale)}
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
              <ClerkLoading>{authSkeleton}</ClerkLoading>
              <ClerkLoaded>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button type="button" className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 sm:py-2 px-3 sm:px-6 rounded-full text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 md:hover:scale-105 active:scale-95 whitespace-nowrap safari-no-faux-bold">
                      {t.login}
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    {...userButtonProps}
                    appearance={{ elements: { avatarBox: "w-8 h-8 sm:w-9 sm:h-9 border-2 border-amber-400 shadow-sm" } }}
                  >
                    <UserButton.MenuItems>
                      <UserButton.Link
                        label="プロフィール設定"
                        labelIcon={<img src="/icons/course.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                        href="/onboarding"
                      />
                      {(currentStatus?.role === 'ADMIN' || currentStatus?.role === 'PARENT') && (
                        <UserButton.Link
                          label="管理者ダッシュボード"
                          labelIcon={<img src="/icons/dashboard.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/admin"
                        />
                      )}
                      {(currentStatus?.role === 'ADMIN' || currentStatus?.role === 'PARENT') && (
                        <UserButton.Link
                          label="ユーザー管理"
                          labelIcon={<img src="/icons/users.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/admin/users"
                        />
                      )}
                      {(currentStatus?.role === 'ADMIN' || currentStatus?.role === 'PARENT') && (
                        <UserButton.Link
                          label="Google AdSense"
                          labelIcon={<img src="/icons/ad.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/admin/adsense"
                        />
                      )}
                      {multiSessionEnabled && (
                        <UserButton.Action
                          label="アカウント切り替え"
                          labelIcon={<img src="/icons/plus.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          onClick={() => {
                            window.location.href = addAccountHref;
                          }}
                        />
                      )}
                    </UserButton.MenuItems>
                  </UserButton>
                </SignedIn>
              </ClerkLoaded>
            </>
          ) : (
            authSkeleton
          )}
        </div>
      </div>
    </header>
  );
}
