/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/admin/page.tsx
// Title: Admin Dashboard
// Purpose: Allows admins to manage and create quizzes.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminClientWrapper from './AdminClientWrapper';
import { canAccessAdmin } from '@/lib/authz';

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

export default async function AdminPage() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect('/');
  }

  const activeUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true, xp: true, level: true },
  });

  if (!activeUser || !canAccessAdmin(activeUser.role)) {
    redirect('/');
  }

  const userStatus = {
    xp: activeUser.xp || 0,
    level: activeUser.level || 1,
    role: activeUser.role,
  };

  // Fetch comments
  const rawComments = await prisma.comment.findMany({
    select: {
      id: true,
      content: true,
      quizId: true,
      createdAt: true,
      user: { select: { name: true } },
      quiz: {
        select: {
          translations: {
            where: { locale: 'ja' },
            select: { title: true }
          }
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const initialComments = rawComments.map((c: any) => ({
    id: c.id,
    content: c.content,
    userName: c.user?.name || 'ゲスト',
    quizId: c.quizId,
    quizTitle: c.quiz.translations[0]?.title || '無題のクイズ',
    createdAt: c.createdAt.toISOString(),
  }));

  const rawQuizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      categoryId: true,
      targetAge: true,
      imageUrl: true,
      createdAt: true,
      translations: {
        select: {
          locale: true,
          title: true,
          imageUrl: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const quizzes = rawQuizzes.map((q: any) => {
    const translationsMap: any = {};
    const jaT = q.translations.find((t: any) => t.locale === 'ja') || {
      title: 'No Title', type: 'TEXT', imageUrl: null
    };

    ['ja', 'en', 'zh'].forEach(loc => {
      const t = q.translations.find((trans: any) => trans.locale === loc);
      translationsMap[loc] = {
        title: t?.title || jaT.title,
        type: (t?.type || jaT.type) as 'CHOICE' | 'TEXT',
        imageUrl: t?.imageUrl || null,
      };
    });

    return {
      id: q.id,
      title: jaT.title,
      type: jaT.type,
      imageUrl: q.imageUrl,
      category: q.categoryId,
      categoryId: q.categoryId,
      targetAge: q.targetAge,
      createdAt: q.createdAt.toISOString(),
      translations: translationsMap,
    };
  });

  // Fetch categories from DB
  const categories = await prisma.$queryRawUnsafe<CategoryRow[]>(
    'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "systemPrompt", "icon" FROM "Category" ORDER BY "sortOrder" ASC, "minAge" ASC, "createdAt" ASC'
  );

  return <AdminClientWrapper initialQuizzes={quizzes} categories={categories} userStatus={userStatus} initialComments={initialComments} />;
}
