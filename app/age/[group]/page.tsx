import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getServerLocale } from '@/lib/locale-server';
import { getAbsoluteUrl, getDefaultOgImageUrl } from '@/lib/metadata';
import PublicQuizCollectionPage from '@/app/components/PublicQuizCollectionPage';
import { PUBLIC_AGE_GROUPS, type PublicCategoryRecord } from '@/lib/public-collections';

export const revalidate = 3600;

async function getAgePageData(min: number, max: number) {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const [categories, quizzes] = await Promise.all([
    prisma.$queryRawUnsafe<PublicCategoryRecord[]>(
      'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "icon" FROM "Category" ORDER BY "sortOrder" ASC, "createdAt" ASC'
    ),
    prisma.quiz.findMany({
      where: {
        targetAge: {
          gte: min,
          lte: max,
        },
      },
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

export async function generateStaticParams() {
  return PUBLIC_AGE_GROUPS.map((group) => ({ group: group.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string }>;
}): Promise<Metadata> {
  const { group } = await params;
  const locale = await getServerLocale();
  const ageGroup = PUBLIC_AGE_GROUPS.find((item) => item.key === group);
  if (!ageGroup) return { title: 'Age Group Not Found' };

  const title =
    locale === 'en'
      ? `${ageGroup.label.en} Quizzes`
      : locale === 'zh'
        ? `${ageGroup.label.zh}测验`
        : `${ageGroup.label.ja}向けクイズ一覧`;
  const description =
    locale === 'en'
      ? `Explore quizzes for ${ageGroup.rangeLabel.en} on Cue.`
      : locale === 'zh'
        ? `查看适合${ageGroup.rangeLabel.zh}学习者的测验。`
        : `${ageGroup.rangeLabel.ja}の学習者向けクイズをまとめた一覧ページです。`;
  const canonical = getAbsoluteUrl(`/age/${group}`);
  const image = getDefaultOgImageUrl();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function AgeGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const locale = await getServerLocale();
  const ageGroup = PUBLIC_AGE_GROUPS.find((item) => item.key === group);
  if (!ageGroup) notFound();

  const { categories, quizzes } = await getAgePageData(ageGroup.min, ageGroup.max);

  return (
    <PublicQuizCollectionPage
      locale={locale}
      title={
        locale === 'en'
          ? `${ageGroup.label.en} Quizzes`
          : locale === 'zh'
            ? `${ageGroup.label.zh}测验`
            : `${ageGroup.label.ja}向けクイズ一覧`
      }
      description={
        locale === 'en'
          ? `Explore quizzes designed for ${ageGroup.rangeLabel.en}. This gives search engines and learners a dedicated landing page by age range.`
          : locale === 'zh'
            ? `查看适合${ageGroup.rangeLabel.zh}学习者的测验。按年龄段拆分的入口页更方便用户和搜索引擎理解。`
            : `${ageGroup.rangeLabel.ja}の学習者向けクイズをまとめた公開ページです。年齢帯ごとの入口として、ユーザーにも検索エンジンにも分かりやすくなります。`
      }
      badge={ageGroup.rangeLabel[locale]}
      quizzes={quizzes}
      categories={categories}
      navLinks={PUBLIC_AGE_GROUPS.map((item) => ({
        href: `/age/${item.key}`,
        label: item.label[locale],
        active: item.key === ageGroup.key,
      }))}
    />
  );
}
