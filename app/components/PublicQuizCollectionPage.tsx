'use client';

import Image from 'next/image';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { usePreferredLocale } from '@/app/hooks/usePreferredLocale';
import type { Locale } from '@/app/types';
import { pickPublicCategoryName, type PublicCategoryRecord } from '@/lib/public-collections';
import dynamic from 'next/dynamic';

const Footer = dynamic(() => import('@/app/components/Footer'), { ssr: false });

type PublicQuizItem = {
  id: string;
  categoryId: string;
  targetAge: number;
  imageUrl: string | null;
  _count?: { histories?: number };
  translations: Array<{
    locale: string;
    title: string;
    imageUrl: string | null;
  }>;
};

type PublicQuizCollectionPageProps = {
  locale: Locale;
  title: string;
  description: string;
  badge: string;
  quizzes: PublicQuizItem[];
  categories: PublicCategoryRecord[];
  navLinks?: Array<{ href: string; label: string; active?: boolean }>;
};

export default function PublicQuizCollectionPage({
  locale: initialLocale,
  title,
  description,
  badge,
  quizzes,
  categories,
  navLinks = [],
}: PublicQuizCollectionPageProps) {
  const { locale, setLocale } = usePreferredLocale();
  const activeLocale = locale || initialLocale;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header locale={activeLocale} setLocale={setLocale} hideSearch />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-[calc(var(--header-height,112px)+1.5rem)] pb-8 sm:pt-24 sm:pb-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/" className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
            {activeLocale === 'en' ? 'Back to home' : activeLocale === 'zh' ? '返回首页' : 'ホームへ戻る'}
          </Link>
          <Link href="/new" className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
            {activeLocale === 'en' ? 'New' : activeLocale === 'zh' ? '最新' : '新着'}
          </Link>
          <Link href="/popular" className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-amber-600 transition-colors">
            {activeLocale === 'en' ? 'Popular' : activeLocale === 'zh' ? '热门' : '人気'}
          </Link>
        </div>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-600 border border-amber-100">
              {badge}
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight safari-no-faux-bold">{title}</h1>
            <p className="max-w-3xl text-sm sm:text-base font-semibold text-zinc-500 leading-relaxed">
              {description}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-zinc-400">
              {activeLocale === 'en'
                ? `${quizzes.length} quizzes are listed on this page.`
                : activeLocale === 'zh'
                  ? `此页面收录了 ${quizzes.length} 道题目。`
                  : `このページには ${quizzes.length} 問のクイズを掲載しています。`}
            </p>
          </div>
        </section>

        {navLinks.length > 0 && (
          <section className="mt-6">
            <div className="flex flex-wrap gap-2">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition-colors ${
                    item.active
                      ? 'bg-amber-500 text-white'
                      : 'border border-[var(--border)] bg-[var(--card)] text-zinc-500 hover:text-amber-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xl sm:text-2xl font-semibold safari-no-faux-bold">
              {activeLocale === 'en' ? 'Published Quizzes' : activeLocale === 'zh' ? '已发布题目' : '公開中のクイズ'}
            </h2>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {quizzes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {quizzes.map((quiz) => {
                const translation =
                  quiz.translations.find((item) => item.locale === activeLocale) ||
                  quiz.translations.find((item) => item.locale === 'ja') ||
                  quiz.translations[0];
                const category = categories.find((item) => item.id === quiz.categoryId);
                const categoryName = category ? pickPublicCategoryName(category, activeLocale) : quiz.categoryId;
                const cardImage = translation?.imageUrl || quiz.imageUrl || '/images/no-image.png';
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
                        alt={translation?.title || title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                        className="object-cover md:group-hover:scale-105 transition-transform duration-500"
                        unoptimized={isDataUri}
                      />
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-lg border border-white/10">
                        {quiz.targetAge}
                        {activeLocale === 'en' ? ' y/o' : activeLocale === 'zh' ? '岁' : '歳向け'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] font-bold leading-snug group-hover:text-amber-500 transition-colors">
                        {translation?.title || title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          {categoryName}
                        </span>
                        <span className="text-[10px] text-zinc-400/70 flex items-center gap-1 leading-none">
                          • {quiz._count?.histories || 0}
                          {activeLocale === 'en' ? ' views' : activeLocale === 'zh' ? ' 次' : ' 回'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm font-bold text-zinc-500">
              {activeLocale === 'en'
                ? 'No quizzes have been published here yet.'
                : activeLocale === 'zh'
                  ? '这里还没有公开题目。'
                  : 'まだクイズが公開されていません。'}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
