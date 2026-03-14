// Path: lib/prisma.ts
// Title: Prisma Client Utility
// Purpose: Prevents multiple Prisma Client instances and provides D1 adapter for Cloudflare.
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  try {
    // OpenNext via Cloudflare Pages provides bindings
    // They can be in process.env or potentially on the global/context
    const d1 = (process.env as any).DB || (globalThis as any).DB;
    
    if (d1) {
      console.log("D1 Binding 'DB' detected.");
      const adapter = new PrismaD1(d1);
      return new PrismaClient({ adapter });
    }

    console.warn("D1 Binding 'DB' not found. Falling back to default PrismaClient.");
    return new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  } catch (error) {
    console.error("Failed to initialize Prisma with D1 adapter:", error);
    return new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
