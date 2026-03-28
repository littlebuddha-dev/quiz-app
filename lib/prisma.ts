// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Provides a singleton instance of Prisma Client for Node.js (VPS/SQLite).
// Note: Removed Cloudflare D1 adapter to ensure stability on VPS.

import { PrismaClient } from "@prisma/client";
import { ensureCategoryLocalizationColumns } from "./category-localization";
import { ensureAppIndexes } from "./db-indexes";
import { ensureManagedImageStorageMigration } from "./image-migration";
import { ensureQuizTranslationExplanationColumn } from "./quiz-translation-explanation";
import { ensureQuizTranslationVisualColumns } from "./quiz-translation-visual";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// シングルトンパターンを使用して接続の乱立を防ぐ
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 起動時に一度だけスキーマの整合性を確認
ensureCategoryLocalizationColumns(prisma as any).catch(err => {
  console.error('Failed to ensure category localization columns:', err);
});
ensureQuizTranslationExplanationColumn(prisma as any).catch(err => {
  console.error('Failed to ensure quiz translation explanation column:', err);
});
ensureQuizTranslationVisualColumns(prisma as any).catch(err => {
  console.error('Failed to ensure quiz translation visual columns:', err);
});
ensureAppIndexes(prisma as any).catch(err => {
  console.error('Failed to ensure application indexes:', err);
});
ensureManagedImageStorageMigration(prisma as any).catch(err => {
  console.error('Failed to migrate managed image storage:', err);
});

/**
 * createPrisma関数の互換性維持
 * 他のファイルで createPrisma(env) として呼び出している箇所がある場合のため残します
 */
export function createPrisma(env?: any) {
  return prisma;
}
