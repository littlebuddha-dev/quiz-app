// Path: app/api/user/actions/route.ts
// Title: User Actions API
// Purpose: Handles bookmarking, liking, and history saving for logged-in users.

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// APIコール時にClerkにユーザーが存在するがDBにいない場合の救済処理
// （Webhookが遅延・失敗した時用）
async function ensureUser(clerkId: string) {
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

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, quizId, isCorrect } = body;

    if (!action || !quizId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // DBに同期されているか確認しつつUserを取得
    const user = await ensureUser(clerkId);

    switch (action) {
      case 'history':
        if (typeof isCorrect !== 'boolean') {
          return NextResponse.json({ error: 'isCorrect must be boolean for history' }, { status: 400 });
        }
        await prisma.quizHistory.create({
          data: {
            userId: user.id,
            quizId,
            isCorrect,
          },
        });
        return NextResponse.json({ success: true, message: 'History saved' });

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
