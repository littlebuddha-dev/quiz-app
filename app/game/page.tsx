// Path: app/game/page.tsx
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import GameClientWrapper from './GameClientWrapper';
import { Quiz } from '../types';

export const dynamic = 'force-dynamic';

export default async function GamePage() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);

  const selectedIds = (
    await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM Quiz ORDER BY RANDOM() LIMIT 10`
  ).map((quiz) => quiz.id);

  if (selectedIds.length === 0) {
    return <div className="p-10 text-center font-bold">クイズがありません</div>;
  }

  const rawQuizzes = await prisma.quiz.findMany({
    where: { id: { in: selectedIds } },
    include: { translations: true }
  });

  // Preserve random order
  const orderedRawQuizzes = selectedIds.map(id => rawQuizzes.find(q => q.id === id)).filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quizzes: Quiz[] = orderedRawQuizzes.map((q: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translationsMap: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jaT = q.translations.find((t: any) => t.locale === 'ja') || {
      title: '無題', question: '問題文がありません', hint: '', answer: '', explanation: null, type: 'TEXT', options: null,
    };

    ['ja', 'en', 'zh'].forEach(loc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = q.translations.find((trans: any) => trans.locale === loc);
      translationsMap[loc] = {
        title: t?.title || jaT.title,
        question: t?.question || jaT.question,
        hint: t?.hint || jaT.hint,
        answer: t?.answer || jaT.answer,
        explanation: t?.explanation || jaT.explanation || null,
        type: (t?.type || jaT.type) as 'CHOICE' | 'TEXT',
        options: t?.options ?? jaT.options,
        imageUrl: t?.imageUrl || null,
      };
    });

    return {
      id: q.id,
      category: q.categoryId,
      targetAge: q.targetAge,
      imageUrl: q.imageUrl,
      translations: translationsMap,
      createdAt: q.createdAt.toISOString(),
    };
  });

  return <GameClientWrapper quizzes={quizzes} />;
}
