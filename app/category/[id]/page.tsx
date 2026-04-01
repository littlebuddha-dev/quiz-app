import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getServerLocale } from '@/lib/locale-server';
import { getAbsoluteUrl, getDefaultOgImageUrl, resolveMetadataImageUrl } from '@/lib/metadata';
import Footer from '@/app/components/Footer';
import PublicTopNav from '@/app/components/PublicTopNav';

export const revalidate = 3600;

type CategoryRecord = {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameZh: string | null;
  minAge: number;
  maxAge: number | null;
  icon: string | null;
};

function pickCategoryName(category: CategoryRecord, locale: 'ja' | 'en' | 'zh') {
  if (locale === 'en') return category.nameEn || category.nameJa || category.name;
  if (locale === 'zh') return category.nameZh || category.nameJa || category.name;
  return category.nameJa || category.name;
}

function buildAgeRangeLabel(category: CategoryRecord, locale: 'ja' | 'en' | 'zh') {
  const maxAge = category.maxAge ?? 100;
  if (locale === 'en') {
    return maxAge >= 100 ? `Ages ${category.minAge}+` : `Ages ${category.minAge}-${maxAge}`;
  }
  if (locale === 'zh') {
    return maxAge >= 100 ? `${category.minAge}岁以上` : `${category.minAge}-${maxAge}岁`;
  }
  return maxAge >= 100 ? `${category.minAge}歳以上` : `${category.minAge}〜${maxAge}歳`;
}

function buildCategoryDescription(categoryName: string, ageLabel: string, locale: 'ja' | 'en' | 'zh') {
  if (locale === 'en') {
    return `Explore ${categoryName} quizzes for ${ageLabel}. Find age-appropriate questions, explanations, and learning prompts on Cue.`;
  }
  if (locale === 'zh') {
    return `查看适合${ageLabel}学习者的${categoryName}测验。在 Cue 上找到循序渐进的题目、讲解与学习提示。`;
  }
  return `${ageLabel}向けの${categoryName}クイズ一覧です。Cue でこの分野の問題、解説、学習のきっかけをまとめて見つけられます。`;
}

async function getCategoryBundle(id: string) {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);

  const [category, categories, quizzes] = await Promise.all([
    prisma.$queryRawUnsafe<CategoryRecord[]>(
      'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "icon" FROM "Category" WHERE "id" = ? LIMIT 1',
      id
    ),
    prisma.$queryRawUnsafe<CategoryRecord[]>(
      'SELECT "id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "icon" FROM "Category" ORDER BY "sortOrder" ASC, "createdAt" ASC'
    ),
    prisma.quiz.findMany({
      where: { categoryId: id },
      include: {
        translations: true,
        _count: {
          select: { histories: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
  ]);

  return {
    category: category[0] || null,
    categories,
    quizzes,
  };
}

export async function generateStaticParams() {
  const { env } = await getCloudflareContext({ async: true });
  const prisma = createPrisma(env);
  const categories = await prisma.category.findMany({ select: { id: true } });
  return categories.map((category) => ({ id: category.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const locale = await getServerLocale();
  const bundle = await getCategoryBundle(id);
  if (!bundle.category) {
    return { title: 'Category Not Found' };
  }

  const categoryName = pickCategoryName(bundle.category, locale);
  const ageLabel = buildAgeRangeLabel(bundle.category, locale);
  const description = buildCategoryDescription(categoryName, ageLabel, locale);
  const title =
    locale === 'en'
      ? `${categoryName} Quizzes`
      : locale === 'zh'
        ? `${categoryName}测验`
        : `${categoryName}クイズ一覧`;
  const canonical = getAbsoluteUrl(`/category/${id}`);
  const imageUrl =
    resolveMetadataImageUrl(bundle.quizzes[0]?.translations.find((item) => item.locale === locale)?.imageUrl || bundle.quizzes[0]?.imageUrl) ||
    getDefaultOgImageUrl();

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getServerLocale();
  const { category, categories, quizzes } = await getCategoryBundle(id);

  if (!category) {
    notFound();
  }

  const categoryName = pickCategoryName(category, locale);
  const ageLabel = buildAgeRangeLabel(category, locale);
  const description = buildCategoryDescription(categoryName, ageLabel, locale);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: categoryName,
    description,
    url: getAbsoluteUrl(`/category/${id}`),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: quizzes.slice(0, 20).map((quiz, index) => {
        const translation =
          quiz.translations.find((item) => item.locale === locale) ||
          quiz.translations.find((item) => item.locale === 'ja') ||
          quiz.translations[0];
        return {
          '@type': 'ListItem',
          position: index + 1,
          url: getAbsoluteUrl(`/watch/${quiz.id}`),
          name: translation?.title || quiz.id,
        };
      }),
    },
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicTopNav locale={locale} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className="mb-6">
          <Link href="/" className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
            {locale === 'en' ? 'Back to home' : locale === 'zh' ? '返回首页' : 'ホームへ戻る'}
          </Link>
        </div>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-600 border border-amber-100">
              {ageLabel}
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight safari-no-faux-bold">{categoryName}</h1>
            <p className="max-w-3xl text-sm sm:text-base font-semibold text-zinc-500 leading-relaxed">
              {description}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-zinc-400">
              {locale === 'en'
                ? `${quizzes.length} quizzes currently published in this category.`
                : locale === 'zh'
                  ? `当前这个分类下已公开 ${quizzes.length} 道题目。`
                  : `現在このジャンルで公開されているクイズは ${quizzes.length} 問です。`}
            </p>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => {
              const itemName = pickCategoryName(item, locale);
              const active = item.id === category.id;
              return (
                <Link
                  key={item.id}
                  href={`/category/${item.id}`}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition-colors ${
                    active
                      ? 'bg-amber-500 text-white'
                      : 'border border-[var(--border)] bg-[var(--card)] text-zinc-500 hover:text-amber-600'
                  }`}
                >
                  {item.icon ? (
                    <img
                      src={`/icons/${item.icon}`}
                      alt=""
                      className={`w-4 h-4 ${active ? 'brightness-0 invert' : 'opacity-60 grayscale'}`}
                    />
                  ) : null}
                  {itemName}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xl sm:text-2xl font-semibold safari-no-faux-bold">
              {locale === 'en' ? 'Published Quizzes' : locale === 'zh' ? '已发布题目' : '公開中のクイズ'}
            </h2>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {quizzes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {quizzes.map((quiz) => {
                const translation =
                  quiz.translations.find((item) => item.locale === locale) ||
                  quiz.translations.find((item) => item.locale === 'ja') ||
                  quiz.translations[0];
                const cardImage =
                  translation?.imageUrl ||
                  quiz.imageUrl ||
                  '/images/no-image.png';
                const isDataUri = cardImage.startsWith('data:');

                return (
                  <Link
                    href={`/watch/${quiz.id}`}
                    key={quiz.id}
                    className="group min-w-0 cursor-pointer flex flex-col gap-3 overflow-hidden break-words [overflow-wrap:anywhere]"
                  >
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                      <Image
                        src={cardImage}
                        alt={translation?.title || categoryName}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                        className="object-cover md:group-hover:scale-105 transition-transform duration-500"
                        unoptimized={isDataUri}
                      />
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-lg border border-white/10">
                        {quiz.targetAge}
                        {locale === 'en' ? ' y/o' : locale === 'zh' ? '岁' : '歳向け'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] font-bold leading-snug group-hover:text-amber-500 transition-colors">
                        {translation?.title || categoryName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{categoryName}</div>
                        <span className="text-[10px] text-zinc-400/70 flex items-center gap-1 leading-none">
                          • {quiz._count?.histories || 0}
                          {locale === 'en' ? ' views' : locale === 'zh' ? ' 次' : ' 回'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm font-bold text-zinc-500">
              {locale === 'en'
                ? 'No quizzes have been published in this category yet.'
                : locale === 'zh'
                  ? '这个分类下还没有公开题目。'
                  : 'このジャンルにはまだクイズが公開されていません。'}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
