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
          ? 'Browse the newest quizzes published on Cue. Fresh questions help search engines and learners discover what is new.'
          : locale === 'zh'
            ? '查看 Cue 最新发布的测验。新的题目既方便学习者发现，也有助于搜索引擎持续抓取。'
            : 'Cue に新しく追加されたクイズをまとめた一覧ページです。新着の公開ページとして検索エンジンにも見つけられやすくなります。'
      }
      badge={locale === 'en' ? 'Newest' : locale === 'zh' ? '最新' : '新着'}
      quizzes={quizzes}
      categories={categories}
    />
  );
}
