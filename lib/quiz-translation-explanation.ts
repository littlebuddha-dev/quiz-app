import type { PrismaClient } from '@prisma/client';

type TableInfoRow = {
  name: string;
};

let ensured = false;

export async function ensureQuizTranslationExplanationColumn(prisma: PrismaClient) {
  if (ensured) return;

  const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
    'PRAGMA table_info("QuizTranslation")'
  );

  if (!columns.some((column) => column.name === 'explanation')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "QuizTranslation" ADD COLUMN "explanation" TEXT');
  }

  ensured = true;
}
