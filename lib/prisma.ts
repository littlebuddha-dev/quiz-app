// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Next.jsのホットリロード環境でPrisma Clientの複数インスタンスが生成されるのを防ぐためのシングルトンインスタンス提供ファイル
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
