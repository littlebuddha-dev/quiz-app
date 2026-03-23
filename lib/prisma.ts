// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Provides a factory function to create a Prisma Client instance.
// Supports both Cloudflare D1 (via adapter) and standard Node.js (SQLite).

import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

type CloudflareEnvLike = {
  DB?: ConstructorParameters<typeof PrismaD1>[0];
};

function getGlobalBinding(name: 'DB') {
  const candidate = globalThis as typeof globalThis & Record<string, unknown>;
  return candidate[name];
}

export function createPrisma(env: CloudflareEnvLike | null | undefined) {
  const d1Binding = env?.DB || getGlobalBinding('DB');

  // Cloudflare D1 バインディングがある場合は D1 アダプターを使用
  if (d1Binding) {
    try {
      const adapter = new PrismaD1(d1Binding as any);
      return new PrismaClient({ adapter });
    } catch (error: unknown) {
      console.error("Failed to initialize Prisma with D1 adapter:", error);
      // フォールバックして標準クライアントを試行
    }
  }

  // それ以外（Node.js / VPS / ローカル開発）は標準の Prisma Client (SQLite) を使用
  return new PrismaClient();
}


