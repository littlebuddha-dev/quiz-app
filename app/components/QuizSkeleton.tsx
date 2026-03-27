// Path: app/components/QuizSkeleton.tsx
// Title: Quiz Dashboard Skeleton
// Purpose: Loading placeholder that mimics the layout of QuizClient.

'use client';

import React from 'react';

export default function QuizSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] animate-pulse">
      {/* Header Skeleton */}
      <header className="fixed top-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-md h-16 border-b border-[var(--border)] z-50 flex items-center px-4 sm:px-6">
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg mr-6" />
        <div className="flex-1 max-w-2xl hidden sm:block">
          <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
      </header>

      {/* Sidebar Skeleton (Desktop) */}
      <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] fixed left-0 top-16 hidden md:block p-4">
        <div className="space-y-6">
          <div className="h-24 w-full bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl" />
            ))}
          </div>
          <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/50 rounded-xl" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 w-full bg-zinc-100 dark:bg-zinc-900/50 rounded-xl" />
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="pt-24 md:pl-72 px-4 sm:px-6 pb-10">
        {/* AdSense Placeholder */}
        <div className="mb-8 h-32 w-full bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl" />

        {/* Study Dashboard Placeholder */}
        <div className="mb-8 h-40 w-full bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-video w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
