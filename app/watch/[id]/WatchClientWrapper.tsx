// Path: app/watch/[id]/WatchClientWrapper.tsx
// Title: Watch Client SSR Wrapper
// Purpose: Disables SSR for the WatchClient component to prevent hydration errors.

'use client';

import dynamic from 'next/dynamic';

const WatchClient = dynamic(() => import('./WatchClient'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-20 text-zinc-500 font-bold">読み込み中...</div>
});

export default function WatchClientWrapper(props: any) {
  return <WatchClient {...props} />;
}
