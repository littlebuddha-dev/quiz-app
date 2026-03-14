// /Users/Shared/Program/nextjs/quiz-app/app/onboarding/page.tsx
// Title: Onboarding Page (Server)
// Purpose: Server component for initial onboarding authentication check.

import { createPrisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { redirect } from 'next/navigation';
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const { userId: clerkId } = await auth();
  const user = await currentUser();

  if (!clerkId || !user) {
    redirect('/');
  }

  // 既にオンボーディング済みかチェック
  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  // ADMINはオンボーディングをスキップできる（任意）が、
  // ここでは birthDate がすでにあるならメインへ飛ばす
  if (existingUser?.birthDate) {
    redirect('/');
  }

  // カテゴリーリストを取得してオンボーディングで選択できるようにする
  const categories = await prisma.category.findMany({
    orderBy: { minAge: 'asc' },
  });

  const displayCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
  }));

  const initialData = {
    name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
    email: user.emailAddresses[0]?.emailAddress || '',
  };

  return (
    <OnboardingClient 
      initialData={initialData} 
      categories={displayCategories} 
    />
  );
}
