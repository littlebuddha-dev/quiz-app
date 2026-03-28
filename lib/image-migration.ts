import { storeDataUrl } from './image-storage';

type ImageMigrationPrisma = {
  quiz: {
    findMany: (args: object) => Promise<Array<{ id: string; imageUrl: string }>>;
    update: (args: object) => Promise<unknown>;
  };
  quizTranslation: {
    findMany: (args: object) => Promise<Array<{ id: string; imageUrl: string | null }>>;
    update: (args: object) => Promise<unknown>;
  };
  channel: {
    findMany: (args: object) => Promise<Array<{ id: string; avatarUrl: string | null }>>;
    update: (args: object) => Promise<unknown>;
  };
};

let ensured = false;
let ensurePromise: Promise<void> | null = null;

async function migrateRows<T extends { id: string }>(
  rows: T[],
  getValue: (row: T) => string | null | undefined,
  updateValue: (row: T, value: string) => Promise<unknown>
) {
  for (const row of rows) {
    const currentValue = getValue(row);
    if (!currentValue || !currentValue.startsWith('data:')) continue;

    const stored = await storeDataUrl(currentValue);
    await updateValue(row, stored.publicPath);
  }
}

export async function ensureManagedImageStorageMigration(prisma: ImageMigrationPrisma) {
  if (ensured) return;
  if (ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = (async () => {
    const [quizzes, translations, channels] = await Promise.all([
      prisma.quiz.findMany({ select: { id: true, imageUrl: true } }),
      prisma.quizTranslation.findMany({ select: { id: true, imageUrl: true } }),
      prisma.channel.findMany({ select: { id: true, avatarUrl: true } }),
    ]);

    await migrateRows(quizzes, (row) => row.imageUrl, (row, value) =>
      prisma.quiz.update({
        where: { id: row.id },
        data: { imageUrl: value },
      })
    );
    await migrateRows(translations, (row) => row.imageUrl, (row, value) =>
      prisma.quizTranslation.update({
        where: { id: row.id },
        data: { imageUrl: value },
      })
    );
    await migrateRows(channels, (row) => row.avatarUrl, (row, value) =>
      prisma.channel.update({
        where: { id: row.id },
        data: { avatarUrl: value },
      })
    );

    ensured = true;
  })();

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}
