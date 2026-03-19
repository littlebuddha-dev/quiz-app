'use client';

import { useState } from 'react';
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LOCALE;
    }

    const savedLocale = window.localStorage.getItem(STORAGE_KEY);
    return normalizeLocale(savedLocale || navigator.language);
  });

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  return { locale, setLocale };
}
