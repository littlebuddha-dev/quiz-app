// Path: app/api/comments/route.ts
// Title: Comments API
// Purpose: Handles posting new comments to a quiz.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { quizId, content } = body;

    if (!quizId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Clerk IDからDBの内部ユーザーIDを取得
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in local DB' }, { status: 404 });
    }

    // コメントを作成
    const newComment = await prisma.comment.create({
      data: {
        quizId,
        userId: user.id,
        content,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: newComment.id,
        content: newComment.content,
        userName: newComment.user.name || 'ゲスト',
        createdAt: newComment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Comment Post Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
