import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdSenseAdminClient from './AdSenseAdminClient';

export default async function AdSenseAdminPage() {
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

  if (!activeUser || (activeUser.role !== 'ADMIN' && activeUser.role !== 'PARENT')) {
    redirect('/');
  }

  const userStatus = { xp: activeUser.xp || 0, level: activeUser.level || 1, role: activeUser.role };

  return <AdSenseAdminClient userStatus={userStatus} />;
}
