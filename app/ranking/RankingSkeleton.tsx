// Path: app/ranking/RankingSkeleton.tsx
// Title: Ranking Page Skeleton
// Purpose: Loading placeholder that mimics the layout of RankingClient.

'use client';

import React from 'react';

export default function RankingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] animate-pulse">
      {/* Header Skeleton */}
      <header className="fixed top-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-md h-16 border-b border-[var(--border)] z-50 flex items-center px-4 sm:px-6">
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg mr-6" />
        <div className="flex items-center gap-4 ml-auto">
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      </header>

      <main className="pt-24 max-w-4xl mx-auto px-4">
        {/* Hero Section Skeleton */}
        <section className="text-center mb-12 flex flex-col items-center">
          <div className="h-20 w-20 bg-amber-500/10 rounded-3xl mb-4" />
          <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-4" />
          <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded opacity-60" />
        </section>

        {/* Tab Switcher Skeleton */}
        <div className="flex bg-[var(--card)] p-1.5 rounded-2xl border border-[var(--border)] mb-8">
          <div className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl" />
          <div className="flex-1 h-12 bg-transparent rounded-xl" />
        </div>

        {/* Ranking List Skeleton */}
        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] bg-zinc-50/50 dark:bg-zinc-900/50 h-10" />
          <div className="divide-y divide-[var(--border)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded opacity-60" />
                  </div>
                </div>
                <div className="h-8 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
