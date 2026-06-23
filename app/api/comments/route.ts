// Path: app/api/comments/route.ts
// Title: Comments API
// Purpose: Handles posting new comments to a quiz.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureLocalUser } from '@/lib/clerk-sync';
import { ensureCommentReplyColumns } from '@/lib/comment-replies';

type CommentNode = {
  id: string;
  parentCommentId: string | null;
  content: string;
  userName: string;
  createdAt: string;
  replies: CommentNode[];
};

function buildCommentTree(
  comments: Array<{
    id: string;
    parentCommentId: string | null;
    content: string;
    createdAt: Date;
    user?: { name: string | null } | null;
  }>
) {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    byId.set(comment.id, {
      id: comment.id,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      userName: comment.user?.name || 'ゲスト',
      createdAt: comment.createdAt.toISOString(),
      replies: [],
    });
  }

  for (const comment of comments) {
    const node = byId.get(comment.id);
    if (!node) continue;
    if (comment.parentCommentId) {
      const parent = byId.get(comment.parentCommentId);
      if (parent) {
        parent.replies.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  return roots;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureCommentReplyColumns(prisma as any);
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quizId' }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { quizId },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const formattedComments = buildCommentTree(comments);

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error('Comment Get Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureCommentReplyColumns(prisma as any);
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as { quizId?: string; content?: string; parentCommentId?: string | null };
    const { quizId, content, parentCommentId } = body;

    if (!quizId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let normalizedParentCommentId: string | null = null;
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { id: true, quizId: true, parentCommentId: true },
      });
      if (!parentComment || parentComment.quizId !== quizId) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
      }
      normalizedParentCommentId = parentComment.parentCommentId ? parentComment.parentCommentId : parentComment.id;
    }

    // Clerk IDからDBの内部ユーザーIDを取得
    const user = await ensureLocalUser(clerkId, prisma);

    // コメントを作成
    const newComment = await prisma.comment.create({
      data: {
        quizId,
        userId: user.id,
        parentCommentId: normalizedParentCommentId,
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
        parentCommentId: newComment.parentCommentId,
        content: newComment.content,
        userName: newComment.user.name || 'ゲスト',
        createdAt: newComment.createdAt.toISOString(),
        replies: [],
      },
    });
  } catch (error) {
    console.error('Comment Post Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
