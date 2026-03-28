import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import AnalysisClient from './AnalysisClient';
import { buildAbilityDomainScores, buildAnalysisInsights, countActiveDays } from '@/lib/learning';
import { ensureLocalUser } from '@/lib/clerk-sync';
import { calculateStreak } from '@/lib/streak';

export default async function AnalysisPage() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const { userId: clerkId, redirectToSignIn } = await auth();

  if (!clerkId) {
    return redirectToSignIn({ returnBackUrl: '/analysis' });
  }

  const localUser = await ensureLocalUser(clerkId, prisma);
  const user = await prisma.user.findUnique({
    where: { id: localUser.id },
    select: {
      xp: true,
      level: true,
      role: true,
      histories: {
        select: {
          quizId: true,
          isCorrect: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new Error(`Local user ${localUser.id} disappeared during analysis load`);
  }

  const categories = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    nameJa: string | null;
    nameEn: string | null;
    nameZh: string | null;
  }>>(
    'SELECT "id", "name", "nameJa", "nameEn", "nameZh" FROM "Category" ORDER BY "sortOrder" ASC, "createdAt" ASC'
  );

  const quizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      categoryId: true,
      targetAge: true,
    },
  });

  const histories = user.histories.map((history) => ({
    quizId: history.quizId,
    isCorrect: history.isCorrect,
    createdAt: history.createdAt,
  }));

  const domainScores = buildAbilityDomainScores({
    categories,
    quizzes,
    histories,
  });

  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const categoryLabelMap = new Map(
    categories.map((category) => [category.id, {
      ja: category.nameJa || category.name,
      en: category.nameEn || category.nameJa || category.name,
      zh: category.nameZh || category.nameJa || category.name,
    }])
  );
  const categoryStats = new Map<string, { total: number; correct: number; wrong: number }>();

  for (const history of histories) {
    const quiz = quizById.get(history.quizId);
    if (!quiz) continue;

    const stats = categoryStats.get(quiz.categoryId) || { total: 0, correct: 0, wrong: 0 };
    stats.total += 1;
    stats.correct += history.isCorrect ? 1 : 0;
    stats.wrong += history.isCorrect ? 0 : 1;
    categoryStats.set(quiz.categoryId, stats);
  }

  const weakCategories = Array.from(categoryStats.entries())
    .filter(([, stats]) => stats.total >= 2)
    .map(([categoryId, stats]) => ({
      categoryId,
      label: categoryLabelMap.get(categoryId)?.ja || categoryId,
      labelEn: categoryLabelMap.get(categoryId)?.en || categoryId,
      labelZh: categoryLabelMap.get(categoryId)?.zh || categoryId,
      totalAttempts: stats.total,
      correctCount: stats.correct,
      wrongCount: stats.wrong,
      accuracy: Math.round((stats.correct / stats.total) * 100),
    }))
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.totalAttempts - a.totalAttempts;
    })
    .slice(0, 5);

  const totalAttempts = histories.length;
  const uniqueSolved = new Set(histories.filter((history) => history.isCorrect).map((history) => history.quizId)).size;
  const correctCount = histories.filter((history) => history.isCorrect).length;
  const overallAccuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
  const streakInfo = calculateStreak(histories.map((history) => history.createdAt));
  const activeDays14 = countActiveDays(histories, 14);
  const activeDays7 = countActiveDays(histories, 7);
  const insights = buildAnalysisInsights({
    domainScores,
    weakCategories,
    totalAttempts,
    activeDays14,
    currentStreak: streakInfo.currentStreak,
    overallAccuracy,
  });
  const userStatus = { xp: user.xp || 0, level: user.level || 1, role: user.role };

  return (
    <AnalysisClient
      userStatus={userStatus}
      totalAttempts={totalAttempts}
      uniqueSolved={uniqueSolved}
      overallAccuracy={overallAccuracy}
      activeDays7={activeDays7}
      activeDays14={activeDays14}
      currentStreak={streakInfo.currentStreak}
      bestStreak={streakInfo.bestStreak}
      domainScores={domainScores}
      weakCategories={weakCategories}
      insights={insights}
    />
  );
}
