'use client';

import dynamic from 'next/dynamic';
import RankingSkeleton from './RankingSkeleton';

const RankingClient = dynamic(() => import('./RankingClient'), {
  ssr: true,
  loading: () => <RankingSkeleton />,
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
