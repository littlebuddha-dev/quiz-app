// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Provides a factory function to create a Prisma Client instance with D1 adapter.
// In Cloudflare Workers, the D1 binding MUST be injected per-request from the env object.

import { PrismaClient } from "@prisma/client/edge";
import { PrismaD1 } from "@prisma/adapter-d1";

/**
 * Creates a Prisma Client instance using the provided Cloudflare environment.
 * @param env The environment object containing the D1 binding (DB).
 */
export function createPrisma(env: any) {
  if (!env?.DB) {
    throw new Error("D1 binding 'DB' not found in environment.");
  }
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}
