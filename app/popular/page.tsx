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
          ? 'Browse the quizzes learners open the most on Cue. Popular pages are useful landing pages for both users and search engines.'
          : locale === 'zh'
            ? '查看 Cue 上浏览量较高的测验。热门页面既方便用户发现，也适合作为搜索入口。'
            : 'Cue でよく見られている人気クイズの一覧です。ユーザーにも検索エンジンにも分かりやすい定番の入口ページになります。'
      }
      badge={locale === 'en' ? 'Popular' : locale === 'zh' ? '热门' : '人気'}
      quizzes={quizzes}
      categories={categories}
    />
  );
}
