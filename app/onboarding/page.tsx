/* eslint-disable @typescript-eslint/no-explicit-any */
// /Users/Shared/Program/nextjs/quiz-app/app/onboarding/page.tsx
// Title: Onboarding Page (Server)
// Purpose: Server component for initial onboarding authentication check.

import { createPrisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { redirect } from 'next/navigation';
import OnboardingClient from './OnboardingClient';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';
import { getPrimaryEmailFromClerkUser } from '@/lib/clerk-sync';

type CategoryRow = {
  id: string;
  name: string;
  nameJa: string | null;
};

export const revalidate = 3600; // onboardingは1時間キャッシュで十分

export default async function OnboardingPage() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  await ensureCategoryLocalizationColumns(prisma as any);
  const { userId: clerkId } = await auth();
  const user = await currentUser();

  if (!clerkId || !user) {
    redirect('/');
  }

  // 既にオンボーディング済みかチェック
  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  // ADMINはプロフィールの確認や調整のためにアクセスを許可し、それ以外はトップへ戻す
  if (existingUser?.birthDate && existingUser.role !== 'ADMIN') {
    redirect('/');
  }

  // カテゴリーリストを取得してオンボーディングで選択できるようにする
  const categories = await prisma.$queryRawUnsafe<CategoryRow[]>(
    'SELECT "id", "name", "nameJa" FROM "Category" ORDER BY "minAge" ASC, "createdAt" ASC'
  );

  const displayCategories = categories.map(c => ({
    id: c.id,
    name: c.nameJa || c.name,
  }));

  const initialData = {
    name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
    email: getPrimaryEmailFromClerkUser(user),
  };

  return (
    <OnboardingClient 
      initialData={initialData} 
      categories={displayCategories} 
    />
  );
}
