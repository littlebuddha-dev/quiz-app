// Path: app/watch/[id]/WatchClientWrapper.tsx
// Title: Watch Client SSR Wrapper
// Purpose: Disables SSR for the WatchClient component to prevent hydration errors.

'use client';

import dynamic from 'next/dynamic';
import WatchSkeleton from './WatchSkeleton';
import type { WatchClientProps } from './WatchClient';

const WatchClient = dynamic(() => import('./WatchClient'), { 
  ssr: false,
  loading: () => <WatchSkeleton />
});

export default function WatchClientWrapper(props: WatchClientProps) {
  return <WatchClient {...props} />;
}
