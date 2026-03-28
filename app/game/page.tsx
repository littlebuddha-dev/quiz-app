// Path: app/game/page.tsx
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import GameClientWrapper from './GameClientWrapper';
import { Locale, Quiz, QuizVisualMode } from '../types';
import { parseQuizVisualData } from '@/lib/quiz-translation-visual';

export const revalidate = 0; // ゲーム画面は最新の状態が必要なため動的だが、force-dynamicよりは柔軟

type RawQuizTranslation = {
  quizId: string;
  locale: string;
  title: string;
  question: string;
  hint: string;
  answer: string;
  explanation: string | null;
  type: string;
  options: unknown;
  imageUrl: string | null;
  visualMode: string | null;
  visualData: string | null;
};

type QuizTranslationView = Quiz['translations'][Locale];

function normalizeOptions(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function normalizeVisualMode(value: string | null | undefined): QuizVisualMode {
  if (value === 'image_only') return 'image_only';
  return 'generated';
}

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
  });

  const rawTranslations = await prisma.$queryRawUnsafe<RawQuizTranslation[]>(
    `SELECT "quizId", "locale", "title", "question", "hint", "answer", "explanation", "type", "options", "imageUrl", "visualMode", "visualData"
     FROM "QuizTranslation"
     WHERE "quizId" IN (${selectedIds.map(() => '?').join(',')})`,
    ...selectedIds
  );

  const translationsByQuizId = new Map<string, RawQuizTranslation[]>();
  for (const translation of rawTranslations) {
    const existing = translationsByQuizId.get(translation.quizId);
    if (existing) {
      existing.push(translation);
    } else {
      translationsByQuizId.set(translation.quizId, [translation]);
    }
  }

  // Preserve random order
  const orderedRawQuizzes = selectedIds
    .map((id) => rawQuizzes.find((quiz) => quiz.id === id))
    .filter((quiz): quiz is (typeof rawQuizzes)[number] => Boolean(quiz));

  const locales: Locale[] = ['ja', 'en', 'zh'];

  const quizzes: Quiz[] = orderedRawQuizzes.map((q) => {
    const translationsMap = {} as Record<Locale, QuizTranslationView>;
    const quizTranslations = translationsByQuizId.get(q.id) || [];
    const jaT: RawQuizTranslation = quizTranslations.find((t) => t.locale === 'ja') || {
      quizId: q.id,
      locale: 'ja',
      title: '無題', question: '問題文がありません', hint: '', answer: '', explanation: null, type: 'TEXT', options: null,
      imageUrl: null,
      visualMode: 'generated',
      visualData: null,
    };

    locales.forEach((loc) => {
      const t = quizTranslations.find((trans) => trans.locale === loc);
      translationsMap[loc] = {
        title: t?.title || jaT.title,
        question: t?.question || jaT.question,
        hint: t?.hint || jaT.hint,
        answer: t?.answer || jaT.answer,
        explanation: t?.explanation || jaT.explanation || null,
        type: (t?.type || jaT.type) as 'CHOICE' | 'TEXT',
        options: normalizeOptions(t?.options ?? jaT.options),
        imageUrl: t?.imageUrl || null,
        visualMode: normalizeVisualMode(t?.visualMode),
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
