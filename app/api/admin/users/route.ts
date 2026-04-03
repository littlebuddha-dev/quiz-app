// /Users/Shared/Program/nextjs/quiz-app/app/api/admin/users/route.ts
// Title: User Management API
// Purpose: Fetch all users and update user roles/details for administration.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { PrismaClient } from '@prisma/client';

// 権限チェック関数
async function isAdmin(prisma: PrismaClient, clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === 'ADMIN' || user?.role === 'PARENT';
}

function isClerkNotFound(error: unknown) {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message || '');
  return status === 404 || message.includes('404') || message.toLowerCase().includes('not found');
}

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(prisma, clerkId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { histories: true, likes: true, bookmarks: true }
        }
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(prisma, clerkId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Partial<{
      id: string;
      role: string;
      xp: number;
      level: number;
      name: string;
    }>;
    const { id, role, xp, level, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { clerkId: true },
    });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        xp,
        level,
        name,
      },
    });

    if (targetUser?.clerkId && role) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(targetUser.clerkId, {
          publicMetadata: { role },
        });
      } catch (error) {
        console.warn('Failed to sync role to Clerk metadata:', error);
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(prisma, clerkId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Partial<{ action: string }>;
    if (body.action !== 'sync') {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Unsupported action' }, { status: 400 });
    }

    const localUsers = await prisma.user.findMany({
      select: { id: true, clerkId: true, email: true },
    });
    const client = await clerkClient();

    const removedLocalUserIds: string[] = [];
    const staleUsers: Array<{ id: string; clerkId: string | null; email: string }> = [];

    for (const user of localUsers) {
      if (!user.clerkId) continue;
      try {
        await client.users.getUser(user.clerkId);
      } catch (error) {
        if (isClerkNotFound(error)) {
          staleUsers.push({ id: user.id, clerkId: user.clerkId, email: user.email });
          removedLocalUserIds.push(user.id);
        } else {
          throw error;
        }
      }
    }

    if (removedLocalUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: removedLocalUserIds } },
      });
    }

    return NextResponse.json({
      success: true,
      removedCount: removedLocalUserIds.length,
      staleUsers,
    });
  } catch (error) {
    console.error('Error syncing users with Clerk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(prisma, clerkId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Partial<{ id: string; deleteInClerk?: boolean }>;
    if (!body.id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: body.id },
      select: { id: true, clerkId: true, role: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.clerkId && body.deleteInClerk) {
      const client = await clerkClient();
      try {
        await client.users.deleteUser(targetUser.clerkId);
      } catch (error) {
        if (!isClerkNotFound(error)) {
          throw error;
        }
      }
    }

    await prisma.user.delete({
      where: { id: targetUser.id },
    });

    return NextResponse.json({
      success: true,
      deletedUserId: targetUser.id,
      deletedClerkId: targetUser.clerkId,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
