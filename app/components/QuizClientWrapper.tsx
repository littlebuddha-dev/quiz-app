// Path: app/components/QuizClientWrapper.tsx
// Title: Quiz Client SSR Wrapper
// Purpose: Disables SSR for the QuizClient component to prevent hydration errors caused by browser extensions or dynamic content mismatch.

'use client';

import dynamic from 'next/dynamic';
import { Quiz } from '../types';

// ssr: false を指定してクライアントサイドでのみレンダリング
const QuizClient = dynamic(() => import('./QuizClient'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-20 text-zinc-500 font-bold">Loading...</div>
});

type WrapperProps = {
  initialQuizzes: Quiz[];
  userBookmarks?: string[];
  userLikes?: string[];
  userHistories?: string[];
  userTargetAge?: number | null;
  initialSearchQuery?: string;
  initialCategory?: string;
  userStatus?: { xp: number; level: number; role: string };
  hideHeader?: boolean;
}

export default function QuizClientWrapper(props: WrapperProps) {
  return <QuizClient {...props} />;
}
