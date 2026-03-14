// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Provides a factory function to create a Prisma Client instance with D1 adapter.
// In Cloudflare Workers, the D1 binding MUST be injected per-request from the env object.

import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

// Cache the Prisma instance per request context if possible, 
// though on Cloudflare Workers we usually create it per request.
// This factory function is called per-request in API routes and Server Components.
export function createPrisma(env: any) {
  // 1. ビルドフェーズのチェック
  // Next.jsのビルド（静的生成）中はD1バインディングが利用できないため、
  // エラーを投げずに通常のPrismaClientを返すことでビルドを継続させます。
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test';
  
  // 2. バインディングの探索
  // Cloudflare Workersでは env.DB に入るが、環境によって process.env や globalThis にある可能性も考慮
  const d1 = env?.DB || (process.env as any).DB || (globalThis as any).DB;

  if (!d1) {
    if (isBuildPhase) {
      console.warn("Prerendering phase: D1 binding not found. Using default PrismaClient.");
      return new PrismaClient();
    }
    
    // 実行時にバインディングがない場合は詳細な診断情報をエラーとして投げる
    const availableKeys = env ? Object.keys(env) : 'env is null/undefined';
    throw new Error(`D1 binding 'DB' not found at runtime. Available env keys: ${JSON.stringify(availableKeys)}`);
  }

  try {
    const adapter = new PrismaD1(d1);
    return new PrismaClient({ adapter });
  } catch (error: any) {
    console.error("Failed to initialize Prisma with D1 adapter:", error);
    // 最後の手段として標準クライアントを試すが、Edge環境ではおそらく失敗する
    return new PrismaClient();
  }
}
