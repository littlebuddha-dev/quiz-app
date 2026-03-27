// lib/locale-server.ts
import { cookies, headers } from 'next/headers';
import { Locale } from '@/app/types';

const STORAGE_KEY = 'cue-locale';
const DEFAULT_LOCALE: Locale = 'ja';

/**
 * サーバー側でユーザーの推奨言語を取得します。
 * 優先順位: クッキー > Accept-Language ヘッダー > デフォルト(ja)
 */
export async function getServerLocale(): Promise<Locale> {
  // 1. クッキーからの取得
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(STORAGE_KEY)?.value;
  if (savedLocale === 'ja' || savedLocale === 'en' || savedLocale === 'zh') {
    return savedLocale as Locale;
  }

  // 2. Accept-Language ヘッダーからの取得
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const lower = acceptLanguage.toLowerCase();
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('en')) return 'en';
    if (lower.startsWith('zh')) return 'zh';
  }

  return DEFAULT_LOCALE;
}
