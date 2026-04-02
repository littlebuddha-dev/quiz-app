// lib/locale-server.ts
import { cookies, headers } from 'next/headers';
import { Locale } from '@/app/types';

const STORAGE_KEY = 'cue-locale';
const DEFAULT_LOCALE: Locale = 'ja';

function normalizeLocale(value?: string | null): Locale | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('zh')) return 'zh';
  return null;
}

/**
 * サーバー側でユーザーの推奨言語を取得します。
 * 優先順位: クッキー > Accept-Language ヘッダー > デフォルト(ja)
 */
export async function getServerLocale(): Promise<Locale> {
  const headersList = await headers();

  // 0. ミドルウェアから受け取った lang クエリ優先
  const requestLocale = normalizeLocale(headersList.get('x-cue-locale'));
  if (requestLocale) {
    return requestLocale;
  }

  // 1. クッキーからの取得
  const cookieStore = await cookies();
  const savedLocale = normalizeLocale(cookieStore.get(STORAGE_KEY)?.value);
  if (savedLocale) return savedLocale;

  // 2. Accept-Language ヘッダーからの取得
  const acceptLanguage = headersList.get('accept-language');
  const acceptedLocale = normalizeLocale(acceptLanguage);
  if (acceptedLocale) return acceptedLocale;

  return DEFAULT_LOCALE;
}
