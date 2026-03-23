// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Provides a singleton instance of Prisma Client for Node.js (VPS/SQLite).
// Note: Removed Cloudflare D1 adapter to ensure stability on VPS.

import { PrismaClient } from "@prisma/client";

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

/**
 * createPrisma関数の互換性維持
 * 他のファイルで createPrisma(env) として呼び出している箇所がある場合のため残します
 */
export function createPrisma(env?: any) {
  return prisma;
}