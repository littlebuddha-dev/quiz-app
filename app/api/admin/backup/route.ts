// Path: app/api/admin/backup/route.ts
// Title: Database Backup and Restore API
// Purpose: Allows administrators to export and import the entire database as JSON.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { Prisma } from '@prisma/client';
import { ensureQuizTranslationVisualColumns } from '@/lib/quiz-translation-visual';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
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

    // 画像専用バックアップの場合はZIPファイルとして返す
    if (type === 'images') {
      const zip = new AdmZip();
      
      // 画像ファイルをZIPのローカルパス階層に追加
      for (const asset of assets) {
        const fullPath = path.join(process.cwd(), 'public', asset.path); // asset.path is like '/uploads/managed/xx.jpg'
        if (fs.existsSync(fullPath)) {
          // ZIP内では uploads/managed/xx.jpg というフォルダ構造にする
          const internalFilePath = asset.path.replace(/^\/+/, '');
          const internalDirPath = path.dirname(internalFilePath);
          zip.addLocalFile(fullPath, internalDirPath);
        }
      }

      // メタデータをZIP内に追加（復元時に判定用）
      zip.addFile('backup_meta.json', Buffer.from(JSON.stringify({
        version: '1.2',
        timestamp: new Date().toISOString(),
        type: 'images',
        isZip: true,
      }, null, 2)));

      const zipBuffer = zip.toBuffer();
      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="quiz_backup_images_${Date.now()}.zip"`,
        },
      });
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


