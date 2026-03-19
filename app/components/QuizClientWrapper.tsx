// Path: app/components/QuizClientWrapper.tsx
// Title: Quiz Client SSR Wrapper
// Purpose: Disables SSR for the QuizClient component to prevent hydration errors caused by browser extensions or dynamic content mismatch.

'use client';

import dynamic from 'next/dynamic';
import type { QuizClientWrapperProps } from './QuizClient';

// ssr: false を指定してクライアントサイドでのみレンダリング
const QuizClient = dynamic(() => import('./QuizClient'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-20 text-zinc-500 font-bold">Loading...</div>
});

export default function QuizClientWrapper(props: QuizClientWrapperProps) {
  return <QuizClient {...props} />;
}
