import type { PrismaClient } from '@prisma/client';

type TableInfoRow = {
  name: string;
};

type QuizTranslationLearningContentPrisma = PrismaClient | {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  _activeProvider?: string;
};

let ensured = false;
let ensurePromise: Promise<void> | null = null;

function isDuplicateColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('duplicate column name');
}

export async function ensureQuizTranslationLearningContentColumns(prisma: QuizTranslationLearningContentPrisma) {
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
        'PRAGMA table_info("QuizTranslation")'
      );
      columnNames = new Set(columns.map((column) => column.name));
    } else if (provider === 'postgresql') {
      const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'QuizTranslation'"
      );
      columnNames = new Set(columns.map((column) => column.column_name));
    }

    const addColumn = async (name: string) => {
      if (!columnNames.has(name)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "QuizTranslation" ADD COLUMN "${name}" TEXT`);
      }
    };

    try {
      await addColumn('detailedExplanation');
      await addColumn('learningPoints');
      await addColumn('relatedKnowledge');
      await addColumn('sources');
      await addColumn('references');
      ensured = true;
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
      ensured = true;
    }
  })();

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}
