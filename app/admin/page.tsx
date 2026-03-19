// Path: app/admin/page.tsx
// Title: Admin Dashboard
// Purpose: Allows admins to manage and create quizzes.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminClientWrapper from './AdminClientWrapper';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

type CategoryRow = {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameZh: string | null;
  minAge: number;
  maxAge: number | null;
  systemPrompt: string | null;
  icon: string | null;
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  // Check role and fetch user data
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true, xp: true, level: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
    redirect('/');
  }

  const userStatus = { xp: user.xp || 0, level: user.level || 1, role: user.role };
  await ensureCategoryLocalizationColumns(prisma as any);

  // Fetch all quizzes
  const rawQuizzes = await prisma.quiz.findMany({
    include: {
      translations: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const quizzes = rawQuizzes.map((q: any) => {
    // 全言語の翻訳をマップ形式に変換
    const translationsMap: any = {};
    const jaT = q.translations.find((t: any) => t.locale === 'ja') || {
      title: 'No Title', question: '', hint: '', answer: '', explanation: null, type: 'TEXT', options: null, imageUrl: null
    };

    ['ja', 'en', 'zh'].forEach(loc => {
      const t = q.translations.find((trans: any) => trans.locale === loc);
      translationsMap[loc] = {
        title: t?.title || jaT.title,
        question: t?.question || jaT.question,
        hint: t?.hint || jaT.hint,
        answer: t?.answer || jaT.answer,
        explanation: t?.explanation || jaT.explanation || null,
        type: (t?.type || jaT.type) as 'CHOICE' | 'TEXT',
        options: t?.options ?? jaT.options,
        imageUrl: t?.imageUrl || null,
      };
    });

    return {
      id: q.id,
      title: jaT.title,
      type: jaT.type,
      question: jaT.question,
      hint: jaT.hint,
      answer: jaT.answer,
      explanation: jaT.explanation || null,
      options: jaT.options,
      imageUrl: q.imageUrl,
      category: q.categoryId,
      targetAge: q.targetAge,
      createdAt: q.createdAt.toISOString(),
      translations: translationsMap, // 全翻訳データを含める
    };
  });

  // Fetch categories from DB
  const categories = await prisma.$queryRawUnsafe<CategoryRow[]>(
    'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "systemPrompt", "icon" FROM "Category" ORDER BY "sortOrder" ASC, "minAge" ASC, "createdAt" ASC'
  );

  return <AdminClientWrapper initialQuizzes={quizzes} categories={categories} userStatus={userStatus} />;
}
