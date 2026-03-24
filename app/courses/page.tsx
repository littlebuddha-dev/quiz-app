import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
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
  const { userId: clerkId, redirectToSignIn } = await auth();

  if (!clerkId) {
    return redirectToSignIn({ returnBackUrl: '/courses' });
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
    return redirectToSignIn({ returnBackUrl: '/courses' });
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

  const userStatus = { xp: user.xp || 0, level: user.level || 1, role: user.role };

  return <CoursesClient currentCourse={currentCourseProgress} roadmap={roadmap} userStatus={userStatus} />;
}
