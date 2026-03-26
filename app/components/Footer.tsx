// Path: app/components/Footer.tsx
// Title: Shared Footer Component
// Purpose: Reusable footer with site logo and copyright information.
/* eslint-disable @next/next/no-img-element */
'use client';

import { usePreferredLocale } from '../hooks/usePreferredLocale';
import { Locale } from '../types';

const DICTIONARY: Record<Locale, { catchphrase: string; description: string }> = {
  ja: {
    catchphrase: 'すべての人に学ぶことの楽しさを。',
    description: '直感的なクイズで知的好奇心を刺激するプラットフォーム。',
  },
  en: {
    catchphrase: 'Fun of learning for everyone.',
    description: 'A platform that stimulates intellectual curiosity with intuitive quizzes.',
  },
  zh: {
    catchphrase: '给每个人的学习乐趣。',
    description: '通过直观的测验激发求知欲的平台。',
  },
};

export default function Footer() {
  const { locale } = usePreferredLocale();
  const t = DICTIONARY[locale];

  return (
    <footer className="w-full py-12 pb-24 md:pb-12 bg-transparent border-t border-[var(--border)] mt-auto mt-20" suppressHydrationWarning>
      <div className="container mx-auto px-6 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 group transition-transform hover:scale-105 duration-300">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <img
              src="/logo.svg"
              alt="Cue Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="sr-only">Cue</span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium max-w-md text-center leading-relaxed">
            {t.catchphrase}
            <br />
            {t.description}
          </p>

          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Privacy</a>
            <a href="/terms" className="text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Terms</a>
            <a href="/contact" className="text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Contact</a>
          </div>
        </div>

        <div className="w-12 h-1 bg-gradient-to-r from-transparent via-amber-200 dark:via-amber-900/40 to-transparent rounded-full" />

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 dark:text-zinc-700">
          &copy; Cue Team. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
