// Path: app/components/Footer.tsx
// Title: Shared Footer Component
// Purpose: Reusable footer with site logo and copyright information.
'use client';

import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-12 pb-24 md:pb-12 bg-transparent border-t border-[var(--border)] mt-auto mt-20">
      <div className="container mx-auto px-6 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 group transition-transform hover:scale-105 duration-300">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 drop-shadow-2xl">
            <Image
              src="/logo.png"
              alt="Cue Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-2xl font-black tracking-tighter text-[var(--foreground)] bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
            Cue
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium max-w-md text-center leading-relaxed">
            すべての人に学ぶことの楽しさを。
            <br />
            直感的なクイズで知的好奇心を刺激するプラットフォーム。
          </p>
          
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Terms</a>
            <a href="#" className="text-xs font-bold text-zinc-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Contact</a>
          </div>
        </div>

        <div className="w-12 h-1 bg-gradient-to-r from-transparent via-amber-200 dark:via-amber-900/40 to-transparent rounded-full" />

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 dark:text-zinc-700">
          &copy; {currentYear} Cue Team. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
