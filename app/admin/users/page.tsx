// /Users/Shared/Program/nextjs/quiz-app/app/admin/users/page.tsx
// Title: User Management Page (Server)
// Purpose: Server component for user management authentication and initial state.

import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import UserManagementClient from './UserManagementClient';

export default async function UserManagementPage() {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/');
  }

  // ログインユーザー自身の権限チェック
  const activeUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true, xp: true, level: true },
  });

  if (!activeUser || (activeUser.role !== 'ADMIN' && activeUser.role !== 'PARENT')) {
    redirect('/');
  }

  // 全ユーザーの初期データを取得
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { histories: true, likes: true, bookmarks: true }
      }
    }
  });

  const userStatus = { xp: activeUser.xp, level: activeUser.level, role: activeUser.role };

  return (
    <UserManagementClient 
      initialUsers={users} 
      userStatus={userStatus}
    />
  );
}
