type IndexPrisma = {
  $executeRawUnsafe: (query: string) => Promise<unknown>;
};

let ensured = false;
let ensurePromise: Promise<void> | null = null;

const INDEX_QUERIES = [
  'CREATE INDEX IF NOT EXISTS "Quiz_categoryId_targetAge_createdAt_idx" ON "Quiz"("categoryId", "targetAge", "createdAt" DESC)',
  'CREATE INDEX IF NOT EXISTS "Quiz_targetAge_createdAt_idx" ON "Quiz"("targetAge", "createdAt" DESC)',
  'CREATE INDEX IF NOT EXISTS "Quiz_channelId_createdAt_idx" ON "Quiz"("channelId", "createdAt" DESC)',
  'CREATE INDEX IF NOT EXISTS "QuizHistory_userId_createdAt_idx" ON "QuizHistory"("userId", "createdAt" DESC)',
  'CREATE INDEX IF NOT EXISTS "QuizHistory_quizId_createdAt_idx" ON "QuizHistory"("quizId", "createdAt" DESC)',
  'CREATE INDEX IF NOT EXISTS "QuizHistory_userId_quizId_isCorrect_idx" ON "QuizHistory"("userId", "quizId", "isCorrect")',
  'CREATE INDEX IF NOT EXISTS "Comment_quizId_createdAt_idx" ON "Comment"("quizId", "createdAt" DESC)',
  'CREATE INDEX IF NOT EXISTS "Category_sortOrder_minAge_createdAt_idx" ON "Category"("sortOrder", "minAge", "createdAt" ASC)',
];

export async function ensureAppIndexes(prisma: IndexPrisma) {
  if (ensured) return;
  if (ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = (async () => {
    for (const query of INDEX_QUERIES) {
      await prisma.$executeRawUnsafe(query);
    }
    ensured = true;
  })();

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
}
