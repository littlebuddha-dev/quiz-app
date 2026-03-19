// Path: app/api/admin/backup/route.ts
// Title: Database Backup and Restore API
// Purpose: Allows administrators to export and import the entire database as JSON.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Prisma } from '@prisma/client';

export const runtime = 'edge';

type BackupPayload = {
  version: string;
  timestamp: string;
  data: {
    users: unknown[];
    categories: unknown[];
    channels: unknown[];
    quizzes: unknown[];
    translations: unknown[];
    comments: unknown[];
    bookmarks: unknown[];
    histories: unknown[];
    likes: unknown[];
    subscriptions: unknown[];
    settings: unknown[];
    apiUsage: unknown[];
  };
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

// GET: Export all data
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);

    // Auth Check
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    // Fetch all tables
    const users = await prisma.user.findMany();
    const categories = await prisma.category.findMany();
    const channels = await prisma.channel.findMany();
    const quizzes = await prisma.quiz.findMany();
    const translations = await prisma.quizTranslation.findMany();
    const comments = await prisma.comment.findMany();
    const bookmarks = await prisma.bookmark.findMany();
    const histories = await prisma.quizHistory.findMany();
    const likes = await prisma.quizLike.findMany();
    const subscriptions = await prisma.subscription.findMany();
    const settings = await prisma.setting.findMany();
    const apiUsage = await prisma.apiUsage.findMany();

    const backupData: BackupPayload = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        users,
        categories,
        channels,
        quizzes,
        translations,
        comments,
        bookmarks,
        histories,
        likes,
        subscriptions,
        settings,
        apiUsage,
      },
    };

    return NextResponse.json(backupData, {
      headers: {
        'Content-Disposition': `attachment; filename="quiz_backup_${new Date().toISOString().split('T')[0]}.json"`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'EXPORT_FAILED', message: getErrorMessage(error) }, { status: 500 });
  }
}

// POST: Import/Restore data
export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);

    // Auth Check
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const body = (await req.json()) as Partial<BackupPayload>;
    const data = body.data;

    if (!data || !Array.isArray(data.categories) || !Array.isArray(data.quizzes) || !Array.isArray(data.translations)) {
      return NextResponse.json(
        { error: 'INVALID_BACKUP_FORMAT', message: 'バックアップファイルの形式が正しくありません。' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete children first to satisfy foreign key constraints.
      await tx.comment.deleteMany({});
      await tx.quizLike.deleteMany({});
      await tx.quizHistory.deleteMany({});
      await tx.bookmark.deleteMany({});
      await tx.subscription.deleteMany({});
      await tx.quizTranslation.deleteMany({});
      await tx.quiz.deleteMany({});
      await tx.channel.deleteMany({});
      await tx.user.deleteMany({});
      await tx.category.deleteMany({});
      await tx.apiUsage.deleteMany({});
      await tx.setting.deleteMany({});

      if (Array.isArray(data.users) && data.users.length > 0) {
        await tx.user.createMany({ data: data.users as Prisma.UserCreateManyInput[] });
      }

      if (data.categories.length > 0) {
        await tx.category.createMany({ data: data.categories as Prisma.CategoryCreateManyInput[] });
      }

      if (Array.isArray(data.channels) && data.channels.length > 0) {
        await tx.channel.createMany({ data: data.channels as Prisma.ChannelCreateManyInput[] });
      }

      if (data.quizzes.length > 0) {
        await tx.quiz.createMany({ data: data.quizzes as Prisma.QuizCreateManyInput[] });
      }

      if (data.translations.length > 0) {
        await tx.quizTranslation.createMany({ data: data.translations as Prisma.QuizTranslationCreateManyInput[] });
      }

      if (Array.isArray(data.comments) && data.comments.length > 0) {
        await tx.comment.createMany({ data: data.comments as Prisma.CommentCreateManyInput[] });
      }

      if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
        await tx.bookmark.createMany({ data: data.bookmarks as Prisma.BookmarkCreateManyInput[] });
      }

      if (Array.isArray(data.histories) && data.histories.length > 0) {
        await tx.quizHistory.createMany({ data: data.histories as Prisma.QuizHistoryCreateManyInput[] });
      }

      if (Array.isArray(data.likes) && data.likes.length > 0) {
        await tx.quizLike.createMany({ data: data.likes as Prisma.QuizLikeCreateManyInput[] });
      }

      if (Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
        await tx.subscription.createMany({ data: data.subscriptions as Prisma.SubscriptionCreateManyInput[] });
      }

      if (data.settings && data.settings.length > 0) {
        await tx.setting.createMany({ data: data.settings as Prisma.SettingCreateManyInput[] });
      }

      if (data.apiUsage && data.apiUsage.length > 0) {
        await tx.apiUsage.createMany({ data: data.apiUsage as Prisma.ApiUsageCreateManyInput[] });
      }
    });

    return NextResponse.json({ success: true, message: 'Restore completed successfully' });
  } catch (error: unknown) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: 'IMPORT_FAILED', message: getErrorMessage(error) }, { status: 500 });
  }
}
