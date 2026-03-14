// Path: app/api/user/actions/route.ts
export const runtime = 'edge';
// Title: User Actions API
// Purpose: Handles bookmarking, liking, and history saving for logged-in users.

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { PrismaClient } from '@prisma/client/edge';

// APIコール時にClerkにユーザーが存在するがDBにいない場合の救済処理
// （Webhookが遅延・失敗した時用）
async function ensureUser(clerkId: string, prisma: PrismaClient) {
  let user = await prisma.user.findUnique({ where: { clerkId } });
  
  if (!user) {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;

      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
          role: 'CHILD',
        },
      });
    } catch (error) {
      console.error('Error fetching user from Clerk:', error);
      throw new Error('Could not create user in local DB');
    }
  }
  
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as any;
    const { action, quizId, isCorrect } = body;

    if (!action || !quizId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // DBに同期されているか確認しつつUserを取得
    const user = await ensureUser(clerkId, prisma);

    switch (action) {
      case 'history':
        if (typeof isCorrect !== 'boolean') {
          return NextResponse.json({ error: 'isCorrect must be boolean for history' }, { status: 400 });
        }
        if (isCorrect) {
          // XP加算とレベルアップ処理
          const u = user as any;
          const xpGain = 10;
          let newXp = (u.xp || 0) + xpGain;
          let newLevel = u.level || 1;
          
          // シンプルなレベルアップロジック: 次のレベルに必要なXP = level * 100
          const xpToNextLevel = newLevel * 100;
          if (newXp >= xpToNextLevel) {
            newXp -= xpToNextLevel;
            newLevel += 1;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { xp: newXp, level: newLevel } as any,
          });

          await prisma.quizHistory.create({
            data: {
              userId: user.id,
              quizId,
              isCorrect,
            },
          });
          return NextResponse.json({ 
            success: true, 
            message: 'History saved and XP gained', 
            xpGained: xpGain,
            newLevel: newLevel > ((user as any).level || 1) ? newLevel : undefined
          });
        } else {
          await prisma.quizHistory.create({
            data: {
              userId: user.id,
              quizId,
              isCorrect,
            },
          });
          return NextResponse.json({ success: true, message: 'History saved' });
        }

      case 'bookmark':
        // 後で解く（お気に入り）のトグル処理
        const existingBookmark = await prisma.bookmark.findUnique({
          where: {
            userId_quizId: {
              userId: user.id,
              quizId,
            },
          },
        });
        
        if (existingBookmark) {
          await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
          return NextResponse.json({ success: true, message: 'Bookmark removed', state: false });
        } else {
          await prisma.bookmark.create({
            data: { userId: user.id, quizId },
          });
          return NextResponse.json({ success: true, message: 'Bookmark added', state: true });
        }

      case 'like':
        // いいねのトグル処理
        const existingLike = await prisma.quizLike.findUnique({
          where: {
            userId_quizId: {
              userId: user.id,
              quizId,
            },
          },
        });
        
        if (existingLike) {
          await prisma.quizLike.delete({ where: { id: existingLike.id } });
          return NextResponse.json({ success: true, message: 'Like removed', state: false });
        } else {
          await prisma.quizLike.create({
            data: { userId: user.id, quizId },
          });
          return NextResponse.json({ success: true, message: 'Like added', state: true });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('User action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
