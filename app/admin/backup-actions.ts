// Path: app/admin/backup-actions.ts
// Title: Backup Restore Server Action
// Purpose: Handles large file uploads for database restoration, bypassing API route body limits.

'use server';

import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { ensureQuizTranslationVisualColumns } from '@/lib/quiz-translation-visual';
import {
  restoreManagedAsset,
  type StoredImageAsset,
} from '@/lib/image-storage';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';

type BackupPayload = {
  version: string;
  timestamp: string;
  options?: {
    type?: 'db' | 'users' | 'images' | 'all';
    includeUsers?: boolean;
  };
  data: {
    users: any[];
    categories: any[];
    channels: any[];
    quizzes: any[];
    translations: any[];
    comments: any[];
    bookmarks: any[];
    histories: any[];
    likes: any[];
    subscriptions: any[];
    settings: any[];
    apiUsage: any[];
    assets?: StoredImageAsset[];
  };
};

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Server Action to restore backup.
 * Supports both JSON (via payload object) and ZIP (via FormData containing 'file').
 */
export async function restoreBackupAction(formData: FormData) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureQuizTranslationVisualColumns(prisma);

    // Auth Check
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') throw new Error('Forbidden');

    const file = formData.get('file');

    // Case 1: ZIP File Restoration
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const buffer = Buffer.from(await (file as File).arrayBuffer());
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      
      let restoredCount = 0;
      for (const zipEntry of zipEntries) {
        if (!zipEntry.isDirectory) {
          if (zipEntry.entryName.startsWith('uploads/')) {
            const destPath = path.join(process.cwd(), 'public', zipEntry.entryName);
            await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
            
            const content = zipEntry.getData();
            await fs.promises.writeFile(destPath, content);
            restoredCount++;
          }
        }
      }

      return { 
        success: true, 
        message: `画像データ（${restoredCount}件）の展開と復元が完了しました。`
      };
    }

    // Case 2: JSON Restoration
    const jsonInput = formData.get('json');
    if (jsonInput) {
      let jsonStr = '';
      if (typeof jsonInput === 'string') {
        jsonStr = jsonInput;
      } else if (typeof jsonInput === 'object' && 'arrayBuffer' in jsonInput) {
        // Blob/File として送られてきた場合
        const buffer = Buffer.from(await (jsonInput as File).arrayBuffer());
        jsonStr = buffer.toString('utf-8');
      }

      if (jsonStr) {
        const body = JSON.parse(jsonStr) as Partial<BackupPayload>;
      const data = body.data;
      const includeUsers = body.options?.includeUsers ?? true;

      if (!data) throw new Error('バックアップデータの形式が正しくありません。');

      const hasDbData = Array.isArray(data.quizzes) && data.quizzes.length > 0;
      const hasUserData = Array.isArray(data.users) && data.users.length > 0;
      const hasAssets = Array.isArray(data.assets) && (data.assets as any[]).length > 0;

      // Restore assets from JSON Base64 if any
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
      const backupUsers = Array.isArray(data.users) ? (data.users as Prisma.UserCreateManyInput[]) : [];
      
      const seenEmails = new Set(protectedUsers.map(u => u.email.toLowerCase()).concat(configuredAdminEmails));
      const seenClerkIds = new Set(protectedUsers.map(u => u.clerkId));

      const importableUsers: Prisma.UserCreateManyInput[] = [];
      const skippedBackupUserIds = new Set<string>();

      for (const entry of backupUsers) {
        const email = entry.email?.toLowerCase() || '';
        if (!email || seenEmails.has(email) || seenClerkIds.has(entry.clerkId)) {
          skippedBackupUserIds.add(entry.id as string);
          continue;
        }
        seenEmails.add(email);
        seenClerkIds.add(entry.clerkId);
        importableUsers.push(entry);
      }

      const backupChannels = Array.isArray(data.channels) ? (data.channels as Prisma.ChannelCreateManyInput[]) : [];
      const skippedBackupChannelIds = new Set(
        backupChannels.filter(e => skippedBackupUserIds.has(e.userId)).map(e => e.id).filter((e): e is string => typeof e === 'string')
      );
      const importableChannels = backupChannels.filter(e => !skippedBackupUserIds.has(e.userId));

      // Deletes
      if (hasUserData || hasDbData) {
        await prisma.comment.deleteMany({});
        await prisma.quizLike.deleteMany({});
        await prisma.quizHistory.deleteMany({});
        await prisma.bookmark.deleteMany({});
        await prisma.subscription.deleteMany({});
      }
      if (hasDbData) {
        await prisma.quizTranslation.deleteMany({});
        await prisma.quiz.deleteMany({});
        await prisma.category.deleteMany({});
        await prisma.apiUsage.deleteMany({});
        await prisma.setting.deleteMany({});
      }
      if (hasUserData) {
        await prisma.channel.deleteMany({});
        await prisma.user.deleteMany({
          where: { id: { notIn: Array.from(protectedUserIdSet) } },
        });
      }

      // Re-inserts
      if (includeUsers && importableUsers.length > 0) {
        for (const u of importableUsers) {
          try { await prisma.user.create({ data: u }); } catch (e: any) { if (e.code !== 'P2002') console.error(e); }
        }
      }
      if (data.categories && data.categories.length > 0) {
        for (const cat of data.categories) {
          try { await prisma.category.create({ data: cat }); } catch (e: any) { if (e.code !== 'P2002') console.error(e); }
        }
      }
      if (includeUsers && importableChannels.length > 0) {
        for (const ch of importableChannels) {
          try { await prisma.channel.create({ data: ch }); } catch (e: any) { if (e.code !== 'P2002') console.error(e); }
        }
      }

      if (hasDbData && data.quizzes && data.quizzes.length > 0) {
        const quizData = (data.quizzes as Prisma.QuizCreateManyInput[]).map(q => ({
          ...q,
          channelId: q.channelId && skippedBackupChannelIds.has(q.channelId) ? null : q.channelId,
        }));
        await prisma.quiz.createMany({ data: quizData });
      }

      if (hasDbData && data.translations && data.translations.length > 0) {
        const translationData = (data.translations as any[]).map(row => ({
          ...row,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
        }));
        await prisma.quizTranslation.createMany({ data: translationData });
      }

      // ... other tables (comments, bookmarks, etc.) - abbreviated for brevity but keeping same logic as route.ts ...
      const wrapInserts = async (arr: any[], skippedSet: Set<string>, model: any) => {
        if (hasUserData && Array.isArray(arr) && arr.length > 0) {
          const filtered = arr.filter(e => !skippedSet.has(e.userId));
          if (filtered.length > 0) await model.createMany({ data: filtered });
        }
      };

      await wrapInserts(data.comments, skippedBackupUserIds, prisma.comment);
      await wrapInserts(data.bookmarks, skippedBackupUserIds, prisma.bookmark);
      await wrapInserts(data.histories, skippedBackupUserIds, prisma.quizHistory);
      await wrapInserts(data.likes, skippedBackupUserIds, prisma.quizLike);
      
      if (hasUserData && Array.isArray(data.subscriptions)) {
        const subs = data.subscriptions.filter(e => !skippedBackupUserIds.has(e.userId) && !skippedBackupChannelIds.has(e.channelId));
        if (subs.length > 0) await prisma.subscription.createMany({ data: subs });
      }
      if (hasDbData && Array.isArray(data.settings)) await prisma.setting.createMany({ data: data.settings });
      if (hasDbData && Array.isArray(data.apiUsage)) await prisma.apiUsage.createMany({ data: data.apiUsage });

      return {
        success: true,
        message: `Restore completed successfully. (Images: ${hasAssets}, Users: ${hasUserData}, DB: ${hasDbData})`,
      };
    }
  }

    throw new Error('有効なバックアップデータが見つかりませんでした。');
  } catch (error: any) {
    console.error('Restore Action Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
