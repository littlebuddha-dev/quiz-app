// Path: app/api/admin/backup/route.ts
// Title: Database Backup and Restore API
// Purpose: Allows administrators to export and import the entire database as JSON.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { Prisma } from '@prisma/client';
import { ensureQuizTranslationVisualColumns } from '@/lib/quiz-translation-visual';

type BackupPayload = {
  version: string;
  timestamp: string;
  options?: {
    includeUsers?: boolean;
  };
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

function parseIncludeUsers(value: string | null) {
  if (value === null) return true;
  return value === 'true';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

// GET: Export all data
export async function GET(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureQuizTranslationVisualColumns(prisma);
    const includeUsers = parseIncludeUsers(req.nextUrl.searchParams.get('includeUsers'));

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
    const translations = await prisma.$queryRawUnsafe<unknown[]>(
      'SELECT * FROM "QuizTranslation"'
    );
    const comments = await prisma.comment.findMany();
    const bookmarks = await prisma.bookmark.findMany();
    const histories = await prisma.quizHistory.findMany();
    const likes = await prisma.quizLike.findMany();
    const subscriptions = await prisma.subscription.findMany();
    const settings = await prisma.setting.findMany();
    const apiUsage = await prisma.apiUsage.findMany();

    const backupData: BackupPayload = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      options: {
        includeUsers,
      },
      data: {
        users: includeUsers ? users : [],
        categories,
        channels: includeUsers ? channels : [],
        quizzes,
        translations,
        comments: includeUsers ? comments : [],
        bookmarks: includeUsers ? bookmarks : [],
        histories: includeUsers ? histories : [],
        likes: includeUsers ? likes : [],
        subscriptions: includeUsers ? subscriptions : [],
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
    await ensureQuizTranslationVisualColumns(prisma);

    // Auth Check
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });

    const body = (await req.json()) as Partial<BackupPayload>;
    const data = body.data;
    const includeUsers = body.options?.includeUsers ?? true;

    if (!data || !Array.isArray(data.categories) || !Array.isArray(data.quizzes) || !Array.isArray(data.translations)) {
      return NextResponse.json(
        { error: 'INVALID_BACKUP_FORMAT', message: 'バックアップファイルの形式が正しくありません。' },
        { status: 400 }
      );
    }

    // Cloudflare D1 does not support interactive transactions (`$transaction(async tx => ...)`).
    // Run each dependency layer as a batch transaction instead.
    await prisma.$transaction([
      prisma.comment.deleteMany({}),
      prisma.quizLike.deleteMany({}),
      prisma.quizHistory.deleteMany({}),
      prisma.bookmark.deleteMany({}),
      prisma.subscription.deleteMany({}),
      prisma.quizTranslation.deleteMany({}),
    ]);

    const secondPhaseDeletes: Prisma.PrismaPromise<unknown>[] = [
      prisma.quiz.deleteMany({}),
      prisma.channel.deleteMany({}),
      prisma.category.deleteMany({}),
      prisma.apiUsage.deleteMany({}),
      prisma.setting.deleteMany({}),
    ];

    if (includeUsers) {
      secondPhaseDeletes.splice(2, 0, prisma.user.deleteMany({}));
    }

    await prisma.$transaction(secondPhaseDeletes);

    const phaseOneWrites: Prisma.PrismaPromise<unknown>[] = [];
    if (includeUsers && Array.isArray(data.users) && data.users.length > 0) {
      phaseOneWrites.push(prisma.user.createMany({ data: data.users as Prisma.UserCreateManyInput[] }));
    }
    if (data.categories.length > 0) {
      phaseOneWrites.push(prisma.category.createMany({ data: data.categories as Prisma.CategoryCreateManyInput[] }));
    }
    if (includeUsers && Array.isArray(data.channels) && data.channels.length > 0) {
      phaseOneWrites.push(prisma.channel.createMany({ data: data.channels as Prisma.ChannelCreateManyInput[] }));
    }
    if (phaseOneWrites.length > 0) {
      await prisma.$transaction(phaseOneWrites);
    }

    const phaseTwoWrites: Prisma.PrismaPromise<unknown>[] = [];
    if (data.quizzes.length > 0) {
      const quizData = includeUsers
        ? (data.quizzes as Prisma.QuizCreateManyInput[])
        : (data.quizzes as Prisma.QuizCreateManyInput[]).map((quiz) => ({
            ...quiz,
            channelId: null,
          }));
      phaseTwoWrites.push(prisma.quiz.createMany({ data: quizData }));
    }
    if (phaseTwoWrites.length > 0) {
      await prisma.$transaction(phaseTwoWrites);
    }

    if (data.translations.length > 0) {
      // 標準の createMany を使用し、データベースプロバイダーに依存しないようにします。
      // SQLite でも Prisma 5.21+ / 6.x なら createMany が動作します。
      const translationData = (data.translations as any[]).map(row => ({
        id: row.id,
        quizId: row.quizId,
        locale: row.locale,
        title: row.title,
        question: row.question,
        hint: row.hint,
        answer: row.answer,
        explanation: row.explanation ?? null,
        type: row.type,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
        imageUrl: row.imageUrl ?? null,
        visualMode: row.visualMode ?? 'generated',
        visualData: row.visualData ?? null
      }));

      // 一度に全件挿入するとエラーになる可能性があるため、ある程度のチャンクに分けても良いですが、
      // ここではまずは一括で試みます。
      await prisma.quizTranslation.createMany({ data: translationData });
    }


    const phaseThreeWrites: Prisma.PrismaPromise<unknown>[] = [];
    if (includeUsers && Array.isArray(data.comments) && data.comments.length > 0) {
      phaseThreeWrites.push(prisma.comment.createMany({ data: data.comments as Prisma.CommentCreateManyInput[] }));
    }
    if (includeUsers && Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
      phaseThreeWrites.push(prisma.bookmark.createMany({ data: data.bookmarks as Prisma.BookmarkCreateManyInput[] }));
    }
    if (includeUsers && Array.isArray(data.histories) && data.histories.length > 0) {
      phaseThreeWrites.push(
        prisma.quizHistory.createMany({ data: data.histories as Prisma.QuizHistoryCreateManyInput[] })
      );
    }
    if (includeUsers && Array.isArray(data.likes) && data.likes.length > 0) {
      phaseThreeWrites.push(prisma.quizLike.createMany({ data: data.likes as Prisma.QuizLikeCreateManyInput[] }));
    }
    if (includeUsers && Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
      phaseThreeWrites.push(
        prisma.subscription.createMany({ data: data.subscriptions as Prisma.SubscriptionCreateManyInput[] })
      );
    }
    if (data.settings && data.settings.length > 0) {
      phaseThreeWrites.push(prisma.setting.createMany({ data: data.settings as Prisma.SettingCreateManyInput[] }));
    }
    if (data.apiUsage && data.apiUsage.length > 0) {
      phaseThreeWrites.push(prisma.apiUsage.createMany({ data: data.apiUsage as Prisma.ApiUsageCreateManyInput[] }));
    }
    if (phaseThreeWrites.length > 0) {
      await prisma.$transaction(phaseThreeWrites);
    }

    return NextResponse.json({
      success: true,
      message: includeUsers
        ? 'Restore completed successfully'
        : 'Restore completed successfully (users were excluded)',
    });
  } catch (error: unknown) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: 'IMPORT_FAILED', message: getErrorMessage(error) }, { status: 500 });
  }
}
