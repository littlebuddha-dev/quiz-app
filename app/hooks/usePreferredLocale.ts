'use client';

import { useSyncExternalStore } from 'react';
import { Locale } from '../types';

const STORAGE_KEY = 'cue-locale';
const DEFAULT_LOCALE: Locale = 'ja';

function normalizeLocale(value?: string | null): Locale {
  if (!value) return DEFAULT_LOCALE;

  const lower = value.toLowerCase();
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('zh')) return 'zh';

  return DEFAULT_LOCALE;
}

export function usePreferredLocale() {
  const locale = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('storage', onStoreChange);
      return () => window.removeEventListener('storage', onStoreChange);
    },
    () => {
      const savedLocale = window.localStorage.getItem(STORAGE_KEY);
      return normalizeLocale(savedLocale || navigator.language);
    },
    () => DEFAULT_LOCALE
  );

  const setLocale = (nextLocale: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: nextLocale }));
  };

  return { locale, setLocale };
}
