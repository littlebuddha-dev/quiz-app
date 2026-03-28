// Path: app/api/admin/backup/route.ts
// Title: Database Backup and Restore API
// Purpose: Allows administrators to export and import the entire database as JSON.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { Prisma } from '@prisma/client';
import { ensureQuizTranslationVisualColumns } from '@/lib/quiz-translation-visual';
import {
  buildManagedAssetRecord,
  isUploadPath,
  restoreManagedAsset,
  type StoredImageAsset,
} from '@/lib/image-storage';

type BackupPayload = {
  version: string;
  timestamp: string;
  options?: {
    type?: 'db' | 'users' | 'images' | 'all';
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
    assets?: StoredImageAsset[];
  };
};

function parseIncludeUsers(value: string | null) {
  if (value === null) return true;
  return value === 'true';
}

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function collectManagedAssets(imageUrls: Array<string | null | undefined>) {
  const uniquePaths = Array.from(
    new Set(
      imageUrls.filter((value): value is string => typeof value === 'string' && isUploadPath(value))
    )
  );

  const assets = await Promise.all(
    uniquePaths.map(async (assetPath) => {
      try {
        return await buildManagedAssetRecord(assetPath);
      } catch (error) {
        console.warn(`Failed to include managed asset in backup: ${assetPath}`, error);
        return null;
      }
    })
  );

  return assets.filter((asset): asset is StoredImageAsset => Boolean(asset));
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

    // format=file が指定されている場合はバイナリを直接返す
    const format = req.nextUrl.searchParams.get('format');
    if (format === 'file') {
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
      
      if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Disposition': `attachment; filename="dev.db"`,
            'Content-Type': 'application/x-sqlite3',
          },
        });
      } else {
        return NextResponse.json({ error: 'FILE_NOT_FOUND', message: 'データベースファイルが見つかりません。' }, { status: 404 });
      }
    }

    const type = req.nextUrl.searchParams.get('type') || 'all';
    const isAll = type === 'all';
    const isDb = isAll || type === 'db';
    const isUsers = isAll || type === 'users';
    const isImages = isAll || type === 'images';

    // Fetch DB tables
    const categories = isDb ? await prisma.category.findMany() : [];
    const quizzes = isDb ? await prisma.quiz.findMany() : [];
    const translations = isDb ? await prisma.$queryRawUnsafe<unknown[]>('SELECT * FROM "QuizTranslation"') : [];
    const settings = isDb ? await prisma.setting.findMany() : [];
    const apiUsage = isDb ? await prisma.apiUsage.findMany() : [];

    // Fetch User tables
    const users = isUsers ? await prisma.user.findMany() : [];
    const channels = isUsers ? await prisma.channel.findMany() : [];
    const comments = isUsers ? await prisma.comment.findMany() : [];
    const bookmarks = isUsers ? await prisma.bookmark.findMany() : [];
    const histories = isUsers ? await prisma.quizHistory.findMany() : [];
    const likes = isUsers ? await prisma.quizLike.findMany() : [];
    const subscriptions = isUsers ? await prisma.subscription.findMany() : [];

    // Fetch Assets (images)
    let assets: StoredImageAsset[] = [];
    if (isImages || isAll) {
      // どこかで画像が使われている可能性があるため、該当テーブル全てからURLを抽出
      const imageSourcesQuizzes = isImages ? await prisma.quiz.findMany({ select: { imageUrl: true } }) : quizzes;
      const imageSourcesTranslations = isImages ? await prisma.$queryRawUnsafe<{imageUrl: string|null}[]>('SELECT imageUrl FROM "QuizTranslation"') : translations;
      const imageSourcesChannels = isImages ? await prisma.channel.findMany({ select: { avatarUrl: true } }) : channels;

      assets = await collectManagedAssets([
        ...imageSourcesQuizzes.map((entry: any) => entry.imageUrl),
        ...((imageSourcesTranslations as any[]) || []).map((entry) => entry.imageUrl),
        ...imageSourcesChannels.map((entry: any) => entry.avatarUrl),
      ]);
    }

    const backupData: BackupPayload = {
      version: '1.2',
      timestamp: new Date().toISOString(),
      options: {
        type: type as any,
        includeUsers: isUsers, // 互換性のため
      },
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
        assets,
      },
    };

    const fileNameType = isAll ? 'all' : type;
    return NextResponse.json(backupData, {
      headers: {
        'Content-Disposition': `attachment; filename="quiz_backup_${fileNameType}_${new Date().toISOString().split('T')[0]}.json"`,
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

    let body;
    try {
      body = (await req.json()) as Partial<BackupPayload>;
    } catch (e) {
      console.error('JSON parse error in backup upload:', e);
      return NextResponse.json({
        error: 'JSON_PARSE_ERROR',
        message: 'バックアップデータの読み込みに失敗しました（JSONが不完全です）。ファイルサイズが大きすぎるため、アップロードの途中でデータが途切れた可能性があります。大容量データの移行には、docs/backup_guide.mdに記載の「SQLiteファイル直接コピー」を推奨します。',
        details: getErrorMessage(e)
      }, { status: 400 });
    }
    const data = body.data;
    const includeUsers = body.options?.includeUsers ?? true;

    if (!data) {
      return NextResponse.json(
        { error: 'INVALID_BACKUP_FORMAT', message: 'バックアップデータの形式が正しくありません。' },
        { status: 400 }
      );
    }

    // アップロードされたデータに含まれる内容を判定（空配列でなければ復元対象とみなす）
    const hasDbData = Array.isArray(data.quizzes) && data.quizzes.length > 0;
    const hasUserData = Array.isArray(data.users) && data.users.length > 0;
    const hasAssets = Array.isArray(data.assets) && (data.assets as any[]).length > 0;

    const backupAssets = hasAssets ? (data.assets as StoredImageAsset[]) : [];
    for (const asset of backupAssets) {
      await restoreManagedAsset(asset);
    }

    const configuredAdminEmails = getConfiguredAdminEmails();
    const protectedUsers = hasUserData
      ? await prisma.user.findMany({
          where: {
            OR: [
              { clerkId: userId },
              { role: 'ADMIN' },
              ...(configuredAdminEmails.length > 0 ? [{ email: { in: configuredAdminEmails } }] : []),
            ],
          },
        })
      : [];
    const protectedUserIdSet = new Set(protectedUsers.map((entry) => entry.id));
    const protectedUserEmailSet = new Set(
      protectedUsers.map((entry) => entry.email.toLowerCase()).concat(configuredAdminEmails)
    );
    const protectedUserClerkIdSet = new Set(protectedUsers.map((entry) => entry.clerkId));

    const backupUsers = Array.isArray(data.users) ? (data.users as Prisma.UserCreateManyInput[]) : [];
    const skippedBackupUserIds = new Set(
      backupUsers
        .filter((entry) => {
          const email = entry.email?.toLowerCase?.() || '';
          return protectedUserEmailSet.has(email) || protectedUserClerkIdSet.has(entry.clerkId);
        })
        .map((entry) => entry.id)
        .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    );
    const importableUsers = backupUsers.filter((entry) => !skippedBackupUserIds.has(entry.id as string));

    const backupChannels = Array.isArray(data.channels)
      ? (data.channels as Prisma.ChannelCreateManyInput[])
      : [];
    const skippedBackupChannelIds = new Set(
      backupChannels
        .filter((entry) => skippedBackupUserIds.has(entry.userId))
        .map((entry) => entry.id)
        .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    );
    const importableChannels = backupChannels.filter((entry) => !skippedBackupUserIds.has(entry.userId));

    const firstPhaseDeletes: Prisma.PrismaPromise<unknown>[] = [];
    if (hasUserData) {
      firstPhaseDeletes.push(
        prisma.comment.deleteMany({}),
        prisma.quizLike.deleteMany({}),
        prisma.quizHistory.deleteMany({}),
        prisma.bookmark.deleteMany({}),
        prisma.subscription.deleteMany({})
      );
    }
    if (hasDbData) {
      firstPhaseDeletes.push(prisma.quizTranslation.deleteMany({}));
    }
    if (firstPhaseDeletes.length > 0) {
      await prisma.$transaction(firstPhaseDeletes);
    }

    const secondPhaseDeletes: Prisma.PrismaPromise<unknown>[] = [];
    if (hasDbData) {
      secondPhaseDeletes.push(
        prisma.quiz.deleteMany({}),
        prisma.category.deleteMany({}),
        prisma.apiUsage.deleteMany({}),
        prisma.setting.deleteMany({})
      );
    }
    if (hasUserData) {
      secondPhaseDeletes.push(prisma.channel.deleteMany({}));
      if (protectedUserIdSet.size > 0) {
        secondPhaseDeletes.push(
          prisma.user.deleteMany({
            where: { id: { notIn: Array.from(protectedUserIdSet) } },
          })
        );
      } else {
        secondPhaseDeletes.push(prisma.user.deleteMany({}));
      }
    }
    if (secondPhaseDeletes.length > 0) {
      await prisma.$transaction(secondPhaseDeletes);
    }

    const phaseOneWrites: Prisma.PrismaPromise<unknown>[] = [];
    if (includeUsers && importableUsers.length > 0) {
      phaseOneWrites.push(prisma.user.createMany({ data: importableUsers }));
    }
    if (data.categories.length > 0) {
      phaseOneWrites.push(prisma.category.createMany({ data: data.categories as Prisma.CategoryCreateManyInput[] }));
    }
    if (includeUsers && importableChannels.length > 0) {
      phaseOneWrites.push(prisma.channel.createMany({ data: importableChannels }));
    }
    if (phaseOneWrites.length > 0) {
      await prisma.$transaction(phaseOneWrites);
    }

    const phaseTwoWrites: Prisma.PrismaPromise<unknown>[] = [];
    if (hasDbData && data.quizzes && data.quizzes.length > 0) {
      const quizData = hasUserData
        ? (data.quizzes as Prisma.QuizCreateManyInput[]).map((quiz) => ({
            ...quiz,
            channelId: quiz.channelId && skippedBackupChannelIds.has(quiz.channelId) ? null : quiz.channelId,
          }))
        : (data.quizzes as Prisma.QuizCreateManyInput[]).map((quiz) => ({
            ...quiz,
            channelId: null,
          }));
      phaseTwoWrites.push(prisma.quiz.createMany({ data: quizData }));
    }
    if (phaseTwoWrites.length > 0) {
      await prisma.$transaction(phaseTwoWrites);
    }

    if (hasDbData && data.translations && data.translations.length > 0) {
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
    if (hasUserData && Array.isArray(data.comments) && data.comments.length > 0) {
      const comments = (data.comments as Prisma.CommentCreateManyInput[]).filter(
        (entry) => !skippedBackupUserIds.has(entry.userId)
      );
      if (comments.length > 0) {
        phaseThreeWrites.push(prisma.comment.createMany({ data: comments }));
      }
    }
    if (hasUserData && Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
      const bookmarks = (data.bookmarks as Prisma.BookmarkCreateManyInput[]).filter(
        (entry) => !skippedBackupUserIds.has(entry.userId)
      );
      if (bookmarks.length > 0) {
        phaseThreeWrites.push(prisma.bookmark.createMany({ data: bookmarks }));
      }
    }
    if (hasUserData && Array.isArray(data.histories) && data.histories.length > 0) {
      const histories = (data.histories as Prisma.QuizHistoryCreateManyInput[]).filter(
        (entry) => !skippedBackupUserIds.has(entry.userId)
      );
      if (histories.length > 0) {
        phaseThreeWrites.push(prisma.quizHistory.createMany({ data: histories }));
      }
    }
    if (hasUserData && Array.isArray(data.likes) && data.likes.length > 0) {
      const likes = (data.likes as Prisma.QuizLikeCreateManyInput[]).filter(
        (entry) => !skippedBackupUserIds.has(entry.userId)
      );
      if (likes.length > 0) {
        phaseThreeWrites.push(prisma.quizLike.createMany({ data: likes }));
      }
    }
    if (hasUserData && Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
      const subscriptions = (data.subscriptions as Prisma.SubscriptionCreateManyInput[]).filter(
        (entry) => !skippedBackupUserIds.has(entry.userId) && !skippedBackupChannelIds.has(entry.channelId)
      );
      if (subscriptions.length > 0) {
        phaseThreeWrites.push(prisma.subscription.createMany({ data: subscriptions }));
      }
    }
    if (hasDbData && Array.isArray(data.settings) && data.settings.length > 0) {
      phaseThreeWrites.push(prisma.setting.createMany({ data: data.settings as Prisma.SettingCreateManyInput[] }));
    }
    if (hasDbData && Array.isArray(data.apiUsage) && data.apiUsage.length > 0) {
      phaseThreeWrites.push(prisma.apiUsage.createMany({ data: data.apiUsage as Prisma.ApiUsageCreateManyInput[] }));
    }
    if (phaseThreeWrites.length > 0) {
      await prisma.$transaction(phaseThreeWrites);
    }

    return NextResponse.json({
      success: true,
      message: `Restore completed successfully. (DB updated: ${hasDbData}, Users updated: ${hasUserData}, Images restored: ${hasAssets}) ${hasUserData ? '(' + protectedUsers.length + ' protected admin users kept)' : ''}`,
    });
  } catch (error: unknown) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: 'IMPORT_FAILED', message: getErrorMessage(error) }, { status: 500 });
  }
}
