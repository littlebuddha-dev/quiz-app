// Path: app/admin/page.tsx
// Title: Admin Dashboard
// Purpose: Allows admins to manage and create quizzes.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminClientWrapper from './AdminClientWrapper';

export default async function AdminPage() {
  const { env } = getCloudflareContext();
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

  // Fetch all quizzes
  const rawQuizzes = await prisma.quiz.findMany({
    include: {
      translations: {
        where: { locale: 'ja' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const quizzes = rawQuizzes.map((q: any) => {
    const t = q.translations[0] || {
      title: 'No Title',
      question: '',
      hint: '',
      answer: '',
      type: 'TEXT',
      options: null,
    };
    return {
      id: q.id,
      title: t.title,
      type: t.type,
      question: t.question,
      hint: t.hint,
      answer: t.answer,
      options: t.options,
      imageUrl: q.imageUrl,
      category: q.categoryId,
      targetAge: q.targetAge,
      createdAt: q.createdAt.toISOString(),
    };
  });

  // Fetch categories from DB
  const categories = await prisma.category.findMany({
    orderBy: { minAge: 'asc' },
  });

  return <AdminClientWrapper initialQuizzes={quizzes} categories={categories} userStatus={userStatus} />;
}
