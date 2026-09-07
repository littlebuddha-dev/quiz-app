import type { Metadata } from 'next';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getServerLocale } from '@/lib/locale-server';
import { getAbsoluteUrl, getDefaultOgImageUrl } from '@/lib/metadata';
import PublicQuizCollectionPage from '@/app/components/PublicQuizCollectionPage';
import type { PublicCategoryRecord } from '@/lib/public-collections';

export const revalidate = 3600;

async function getPopularPageData() {
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
      orderBy: [
        { histories: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      take: 60,
    }),
  ]);

  return { categories, quizzes };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title = locale === 'en' ? 'Popular Quizzes' : locale === 'zh' ? '热门测验' : '人気クイズ一覧';
  const description =
    locale === 'en'
      ? 'Browse the most popular quizzes on Cue.'
      : locale === 'zh'
        ? '查看 Cue 上最受欢迎的测验。'
        : 'Cue でよく見られている人気クイズの一覧ページです。';
  const canonical = getAbsoluteUrl('/popular');
  const image = getDefaultOgImageUrl();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function PopularPage() {
  const locale = await getServerLocale();
  const { categories, quizzes } = await getPopularPageData();

  return (
    <PublicQuizCollectionPage
      locale={locale}
      title={locale === 'en' ? 'Popular Quizzes' : locale === 'zh' ? '热门测验' : '人気クイズ一覧'}
      description={
        locale === 'en'
          ? 'See what has everyone thinking. Explore the most-viewed quizzes and find a question worth sharing.'
          : locale === 'zh'
            ? '大家都在思考什么？探索最受关注的测验，找到值得分享的问题。'
            : 'みんなが気になったのは、どんな問い？よく見られているクイズから、話したくなる発見を。'
      }
      badge={locale === 'en' ? 'Popular' : locale === 'zh' ? '热门' : '人気'}
      quizzes={quizzes}
      categories={categories}
    />
  );
}
