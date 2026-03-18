'use client';

import dynamic from 'next/dynamic';

const RankingClient = dynamic(() => import('./RankingClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-20 text-zinc-500 font-bold">
      Loading...
    </div>
  ),
});

type RankingEntry = {
  id: string;
  name: string;
  clerkId?: string | null;
  score: number;
  level: number;
  totalAttempts?: number;
};

type Props = {
  solveRankings: RankingEntry[];
  accuracyRankings: RankingEntry[];
  currentUserClerkId?: string;
  userStatus?: { xp: number; level: number; role: string };
};

export default function RankingClientWrapper(props: Props) {
  return <RankingClient {...props} />;
}
