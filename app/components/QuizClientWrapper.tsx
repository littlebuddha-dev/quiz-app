// Path: app/components/QuizClientWrapper.tsx
// Title: Quiz Client SSR Wrapper
// Purpose: Disables SSR for the QuizClient component to prevent hydration errors caused by browser extensions or dynamic content mismatch.

'use client';

import dynamic from 'next/dynamic';
import QuizSkeleton from './QuizSkeleton';
import type { QuizClientWrapperProps } from './QuizClient';

// ssr: true に変更し、スケルトンを表示
const QuizClient = dynamic(() => import('./QuizClient'), { 
  ssr: true,
  loading: () => <QuizSkeleton />
});

export default function QuizClientWrapper(props: QuizClientWrapperProps) {
  return <QuizClient {...props} />;
}
