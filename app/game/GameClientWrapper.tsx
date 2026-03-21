// Path: app/game/GameClientWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { Quiz } from '../types';

const GameClient = dynamic<{ quizzes: Quiz[] }>(() => import('./GameClient'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white font-bold">読み込み中...</div>
});

export default function GameClientWrapper({ quizzes }: { quizzes: Quiz[] }) {
  return <GameClient quizzes={quizzes} />;
}
