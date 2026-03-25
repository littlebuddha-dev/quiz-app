'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: '/sign-in' });
  }, [signOut]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl shadow-zinc-950/5">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">Cue</div>
          <h1 className="mt-4 text-2xl font-black text-[var(--foreground)]">
            サインアウトしています
          </h1>
          <p className="mt-3 text-sm font-semibold text-zinc-500">
            別のアカウントでログインできるように、認証状態をリセットしています。
          </p>
        </div>
      </div>
    </main>
  );
}
