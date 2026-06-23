import type { PrismaClient } from '@prisma/client';

type TableInfoRow = {
  name: string;
};

type CommentReplyPrisma = PrismaClient | {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  _activeProvider?: string;
};

let ensured = false;
let ensurePromise: Promise<void> | null = null;

function isIgnorableAlterError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('duplicate column name') || message.includes('already exists');
}

export async function ensureCommentReplyColumns(prisma: CommentReplyPrisma) {
  if (ensured) return;
  if (ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = (async () => {
    const provider = (prisma as any)._activeProvider || 'sqlite';
    let columnNames = new Set<string>();

    if (provider === 'sqlite') {
      const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
        'PRAGMA table_info("Comment")'
      );
      columnNames = new Set(columns.map((column) => column.name));
    } else if (provider === 'postgresql') {
      const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'Comment'"
      );
      columnNames = new Set(columns.map((column) => column.column_name));
    }

    try {
      if (!columnNames.has('parentCommentId')) {
        await prisma.$executeRawUnsafe('ALTER TABLE "Comment" ADD COLUMN "parentCommentId" TEXT');
      }
      ensured = true;
    } catch (error) {
      if (!isIgnorableAlterError(error)) throw error;
      ensured = true;
    }
  })();

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}
