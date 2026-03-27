// Path: app/watch/[id]/WatchClientWrapper.tsx
// Title: Watch Client Wrapper
// Purpose: Disables SSR for WatchClient for stability and consistent client-side behavior.
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
