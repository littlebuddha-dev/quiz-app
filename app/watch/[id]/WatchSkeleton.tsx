// Path: app/watch/[id]/WatchSkeleton.tsx
// Title: Watch Page Skeleton
// Purpose: Loading placeholder that mimics the layout of WatchClient.

'use client';

import React from 'react';

export default function WatchSkeleton() {
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

      <div className="pt-24 flex justify-center w-full">
        <div className="max-w-7xl w-full flex flex-col lg:flex-row items-start gap-8 p-4 sm:p-6">
          
          {/* Main Area Skeleton */}
          <div className="flex-1 w-full">
            {/* Visual area */}
            <div className="w-full aspect-video rounded-3xl bg-zinc-200 dark:bg-zinc-800 mb-6" />
            
            {/* Title & Actions */}
            <div className="h-8 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border)]">
              <div className="h-10 w-40 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl" />
              <div className="ml-auto flex gap-2">
                <div className="h-10 w-24 bg-zinc-100 dark:bg-zinc-900/50 rounded-full" />
                <div className="h-10 w-24 bg-zinc-100 dark:bg-zinc-900/50 rounded-full" />
              </div>
            </div>

            {/* Question Box */}
            <div className="h-64 w-full bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 mb-8" />
          </div>

          {/* Sidebar Recommendation Skeleton */}
          <div className="lg:w-96 w-full space-y-6">
            <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-6" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-44 aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded opacity-60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
