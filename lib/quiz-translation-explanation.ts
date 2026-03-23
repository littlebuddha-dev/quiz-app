import type { PrismaClient } from '@prisma/client';

type TableInfoRow = {
  name: string;
};

let ensured = false;

export async function ensureQuizTranslationExplanationColumn(prisma: PrismaClient) {
  if (ensured) return;

  // データベースプロバイダーの特定
  const provider = (prisma as any)._activeProvider || 'sqlite';

  let columnNames = new Set<string>();

  if (provider === 'sqlite') {
    const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
      'PRAGMA table_info("QuizTranslation")'
    );
    columnNames = new Set(columns.map((column) => column.name));
  } else if (provider === 'postgresql') {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'QuizTranslation'"
    );
    columnNames = new Set(columns.map((column) => column.column_name));
  }

  if (!columnNames.has('explanation')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "QuizTranslation" ADD COLUMN "explanation" TEXT');
  }

  ensured = true;
}

