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
import { getServerLocale } from '@/lib/locale-server';
import { getLocalizedPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

type CategoryRow = {
  id: string;
  name: string;
  nameJa: string | null;
};

export const revalidate = 3600; // onboardingは1時間キャッシュで十分

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return getLocalizedPageMetadata(locale, {
    ja: {
      title: 'プロフィール設定',
      description: 'Cueのプロフィール設定を確認・編集できます。',
    },
    en: {
      title: 'Profile Settings',
      description: 'View and update your Cue profile settings.',
    },
    zh: {
      title: '个人资料设置',
      description: '查看并更新你的 Cue 个人资料设置。',
    },
  });
}

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

  // カテゴリーリストを取得してオンボーディングで選択できるようにする
  const categories = await prisma.$queryRawUnsafe<CategoryRow[]>(
    'SELECT "id", "name", "nameJa" FROM "Category" ORDER BY "minAge" ASC, "createdAt" ASC'
  );

  const displayCategories = categories.map(c => ({
    id: c.id,
    name: c.nameJa || c.name,
  }));
  const preferredCategories = Array.isArray(existingUser?.preferredCategories)
    ? existingUser.preferredCategories.filter(
        (value): value is string => typeof value === 'string'
      )
    : [];

  const initialData = {
    name:
      existingUser?.name ||
      (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''),
    email: getPrimaryEmailFromClerkUser(user),
    birthDate: existingUser?.birthDate
      ? new Date(existingUser.birthDate).toISOString().slice(0, 10)
      : '',
    preferredCategories,
    hasCompletedProfile: Boolean(existingUser?.birthDate),
  };

  return (
    <OnboardingClient 
      initialData={initialData} 
      categories={displayCategories} 
    />
  );
}
