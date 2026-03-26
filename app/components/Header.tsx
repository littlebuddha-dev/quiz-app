// Path: app/components/Header.tsx
// Title: Shared Header Component
// Purpose: Reusable header with search, language selector, and user status.
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // ログイン・ログアウト時にサーバーコンポーネントのデータを再取得して
  // userStatus などのプロップを最新にする
  useEffect(() => {
    if (mounted) {
      router.refresh();
    }
  }, [userId, mounted, router]);

  const authSkeleton = (
    <div className="h-8 w-20 sm:w-24 rounded-full bg-zinc-100/80 border border-[var(--border)]" aria-hidden="true" />
  );
  const currentLocation = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
  const addAccountHref = `/sign-in?redirect_url=${encodeURIComponent(currentLocation)}`;
  const userButtonProps = multiSessionEnabled
    ? {
        signInUrl: addAccountHref,
        afterSwitchSessionUrl: currentLocation,
      }
    : {};

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-md px-4 py-3 sm:h-16 sm:px-6 sm:py-0 border-b border-[var(--border)] z-50 transition-colors overflow-x-hidden"
      suppressHydrationWarning
    >
      <div className="flex flex-col gap-3 sm:hidden w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-24">
              <img
                src="/logo-header.svg"
                alt="Cue Logo"
                className="h-full w-full object-contain"
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center">
              {mounted ? (
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
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
                        {multiSessionEnabled && (
                          <UserButton.Link
                            label="他のアカウントを追加"
                            labelIcon={<img src="/icons/plus.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                            href={addAccountHref}
                          />
                        )}
                        <UserButton.Link
                          label="プロフィール設定"
                          labelIcon={<img src="/icons/course.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/onboarding"
                        />
                        {/* 管理者用メニューを別枠（後続）に配置 */}
                        {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
                          <UserButton.Link
                            label="管理者ダッシュボード"
                            labelIcon={<img src="/icons/dashboard.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                            href="/admin"
                          />
                        )}
                        {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
                          <UserButton.Link
                            label="ユーザー管理"
                            labelIcon={<img src="/icons/users.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                            href="/admin/users"
                          />
                        )}
                        {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
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
          {userStatus && (
            <div className="flex-shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-center min-w-[4.5rem]">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Level</div>
              <div className="text-sm font-semibold text-amber-500 safari-no-faux-bold">{userStatus.level}</div>
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
              className="w-full border border-[var(--border)] rounded-full px-4 sm:px-6 py-2 bg-[var(--background)] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/20 transition-all text-[var(--foreground)] text-sm sm:text-base"
            />
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {userStatus && (
            <div className="hidden lg:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Level</span>
                <span className="text-sm font-semibold text-amber-500 safari-no-faux-bold">{userStatus.level}</span>
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
                      {multiSessionEnabled && (
                        <UserButton.Link
                          label="他のGoogleアカウントを追加"
                          labelIcon={<img src="/icons/plus.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href={addAccountHref}
                        />
                      )}
                      <UserButton.Link
                        label="プロフィール設定"
                        labelIcon={<img src="/icons/course.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                        href="/onboarding"
                      />
                      {/* 管理者専用メニューを後半に集約 */}
                      {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
                        <UserButton.Link
                          label="管理者ダッシュボード"
                          labelIcon={<img src="/icons/dashboard.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/admin"
                        />
                      )}
                      {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
                        <UserButton.Link
                          label="ユーザー管理"
                          labelIcon={<img src="/icons/users.svg" alt="" className="w-4 h-4 opacity-70 grayscale" />}
                          href="/admin/users"
                        />
                      )}
                      {(userStatus?.role === 'ADMIN' || userStatus?.role === 'PARENT') && (
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
    </header>
  );
}
