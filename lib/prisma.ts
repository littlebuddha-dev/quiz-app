// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Prevents multiple Prisma Client instances and provides D1 adapter for Cloudflare.
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  // Cloudflare Pages/Workers environment with D1 binding
  // Note: OpenNext exposes bindings on process.env
  const d1 = (process.env as any).DB;
  
  if (d1) {
    const adapter = new PrismaD1(d1);
    return new PrismaClient({ adapter });
  }

  // Fallback for local development or non-edge environments
  return new PrismaClient({
    log: ['query'],
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
