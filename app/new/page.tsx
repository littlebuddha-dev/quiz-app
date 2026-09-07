import type { Metadata } from 'next';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getServerLocale } from '@/lib/locale-server';
import { getAbsoluteUrl, getDefaultOgImageUrl } from '@/lib/metadata';
import PublicQuizCollectionPage from '@/app/components/PublicQuizCollectionPage';
import type { PublicCategoryRecord } from '@/lib/public-collections';

export const revalidate = 3600;

async function getNewPageData() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const [categories, quizzes] = await Promise.all([
    prisma.$queryRawUnsafe<PublicCategoryRecord[]>(
      'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "icon" FROM "Category" ORDER BY "sortOrder" ASC, "createdAt" ASC'
    ),
    prisma.quiz.findMany({
      include: {
        translations: {
          select: { locale: true, title: true, imageUrl: true },
        },
        _count: { select: { histories: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
  ]);

  return { categories, quizzes };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title = locale === 'en' ? 'New Quizzes' : locale === 'zh' ? '最新测验' : '新着クイズ一覧';
  const description =
    locale === 'en'
      ? 'Browse the newest quizzes published on Cue.'
      : locale === 'zh'
        ? '查看 Cue 最新发布的测验。'
        : 'Cue に新しく追加されたクイズをまとめて見られる一覧ページです。';
  const canonical = getAbsoluteUrl('/new');
  const image = getDefaultOgImageUrl();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function NewPage() {
  const locale = await getServerLocale();
  const { categories, quizzes } = await getNewPageData();

  return (
    <PublicQuizCollectionPage
      locale={locale}
      title={locale === 'en' ? 'New Quizzes' : locale === 'zh' ? '最新测验' : '新着クイズ一覧'}
      description={
        locale === 'en'
          ? 'Fresh questions, new perspectives. Find your next discovery among the latest quizzes.'
          : locale === 'zh'
            ? '新题目，新视角。从最新测验中，找到你的下一次发现。'
            : '新しい問い、新しい視点。届いたばかりのクイズから、次の発見を見つけよう。'
      }
      badge={locale === 'en' ? 'Newest' : locale === 'zh' ? '最新' : '新着'}
      quizzes={quizzes}
      categories={categories}
    />
  );
}
