// Path: app/admin/page.tsx
// Title: Admin Dashboard
// Purpose: Allows admins to manage and create quizzes.

import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminClientWrapper from './AdminClientWrapper';

export default async function AdminPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  // Check role
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
    redirect('/');
  }

  const u = user as any;
  const userStatus = { xp: u.xp || 0, level: u.level || 1, role: u.role };

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
      type: 'TEXT',
    };
    return {
      id: q.id,
      title: t.title,
      type: t.type,
      category: q.categoryId,
      targetAge: q.targetAge,
      createdAt: q.createdAt.toISOString(),
    };
  });

  // Setup categories
  const categories = [
    { id: '算数', name: '算数' },
    { id: '国語', name: '国語' },
    { id: '理科', name: '理科' },
    { id: '社会', name: '社会' },
    { id: '英語', name: '英語' },
    { id: '論理パズル', name: '論理パズル' },
    { id: 'プログラミング', name: 'プログラミング' }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)] transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-8">管理者ダッシュボード</h1>
        
        <AdminClientWrapper initialQuizzes={quizzes} categories={categories} userStatus={userStatus} />
      </div>
    </div>
  );
}
