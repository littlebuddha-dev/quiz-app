import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';
import CoursesClient from './CoursesClient';
import {
  buildCourseProgress,
  CURRICULUM_COURSES,
  getCurriculumCourseForAge,
} from '@/lib/learning';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  await ensureCategoryLocalizationColumns(prisma as Parameters<typeof ensureCategoryLocalizationColumns>[0]);
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      histories: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    redirect('/');
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

  const age = user.targetAge || 10;
  const currentCourse = getCurriculumCourseForAge(age);
  const histories = user.histories.map((history) => ({
    quizId: history.quizId,
    isCorrect: history.isCorrect,
    createdAt: history.createdAt,
  }));

  const currentCourseProgress = buildCourseProgress({
    course: currentCourse,
    categories,
    quizzes,
    histories,
  });

  const roadmap = CURRICULUM_COURSES.map((course) =>
    buildCourseProgress({
      course,
      categories,
      quizzes,
      histories,
    })
  );

  return <CoursesClient currentCourse={currentCourseProgress} roadmap={roadmap} />;
}
