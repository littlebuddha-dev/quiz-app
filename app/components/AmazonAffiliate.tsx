'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AffiliatePlacement,
  AmazonMarketplace,
  PublicAmazonAffiliateSettings,
} from '@/lib/amazon-affiliate';
import { buildAmazonAffiliateUrl } from '@/lib/amazon-affiliate';
import type { Locale } from '@/app/types';

type AmazonAffiliateProps = {
  slot: AffiliatePlacement;
  locale: Locale;
  title?: string | null;
  category?: string | null;
  question?: string | null;
  variant?: 'card' | 'sidebar' | 'panel';
};

function normalizeText(value?: string | null) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function buildKeywords(params: {
  locale: Locale;
  title?: string | null;
  category?: string | null;
  question?: string | null;
  fallbackKeywords?: string;
}) {
  const title = normalizeText(params.title);
  const category = normalizeText(params.category);
  const question = normalizeText(params.question)
    .replace(/[（(][^)）]{0,80}[)）]/g, ' ')
    .split(/[。.!?！？]/)[0]
    .trim();
  const seed = [title, category, question].filter(Boolean).join(' ');

  if (seed) {
    const suffix = params.locale === 'en'
      ? 'book study guide'
      : params.locale === 'zh'
        ? '教材 书'
        : '参考書 本';
    return `${seed} ${suffix}`.trim();
  }

  return normalizeText(params.fallbackKeywords);
}

const COPY: Record<Locale, { badge: string; title: string; body: string; cta: string }> = {
  ja: {
    badge: 'Amazon',
    title: '関連する本・教材を見る',
    body: 'このクイズに近いテーマの本や学習アイテムを探せます。',
    cta: 'Amazonで見る',
  },
  en: {
    badge: 'Amazon',
    title: 'Browse Related Books',
    body: 'Explore books and study items related to this quiz topic.',
    cta: 'View on Amazon',
  },
  zh: {
    badge: 'Amazon',
    title: '查看相关书籍与教材',
    body: '可以查找与这道题主题相关的书籍和学习用品。',
    cta: '前往 Amazon',
  },
};

function getMarketplaceForLocale(locale: Locale): AmazonMarketplace {
  return locale === 'ja' ? 'jp' : 'us';
}

export default function AmazonAffiliate({
  slot,
  locale,
  title,
  category,
  question,
  variant = 'panel',
}: AmazonAffiliateProps) {
  const [settings, setSettings] = useState<PublicAmazonAffiliateSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/amazon-affiliate')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data as PublicAmazonAffiliateSettings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const slotSettings = settings?.slots[slot];
  const keywords = useMemo(
    () => buildKeywords({
      locale,
      title,
      category,
      question,
      fallbackKeywords: slotSettings?.fallbackKeywords,
    }),
    [category, locale, question, slotSettings?.fallbackKeywords, title]
  );

  const href = useMemo(() => {
    if (!settings?.associateTag || !keywords) return '';
    return buildAmazonAffiliateUrl({
      marketplace: getMarketplaceForLocale(locale),
      associateTag: settings.associateTag,
      keywords,
    });
  }, [keywords, locale, settings]);

  if (
    loading ||
    !settings?.enabled ||
    !settings.associateTag ||
    !slotSettings?.enabled ||
    !href
  ) {
    return null;
  }

  const copy = COPY[locale];

  if (variant === 'card') {
    return (
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group min-w-0 cursor-pointer flex flex-col gap-3 overflow-hidden break-words [overflow-wrap:anywhere]"
      >
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[var(--border)] bg-[linear-gradient(135deg,#f6c453_0%,#f2a33b_42%,#18181b_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_45%)]" />
          <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/92 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
            {copy.badge}
          </div>
          <div className="absolute inset-x-4 bottom-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
              {locale === 'ja' ? '関連教材' : locale === 'en' ? 'Study Picks' : '相关教材'}
            </div>
            <div className="mt-1 text-lg font-black leading-tight">
              {copy.title}
            </div>
            <div className="mt-2 inline-flex items-center rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[11px] font-black text-white/92 transition-colors group-hover:bg-black/30">
              {copy.cta}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] font-bold leading-snug transition-colors group-hover:text-amber-500">
            {copy.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Amazon
            </span>
            <span className="text-[10px] text-zinc-400/70 leading-none">
              {copy.body}
            </span>
          </div>
        </div>
      </a>
    );
  }

  if (variant === 'sidebar') {
    return (
      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
          {copy.badge}
        </div>
        <h3 className="mt-3 text-base font-semibold leading-snug safari-no-faux-bold">
          {copy.title}
        </h3>
        <p className="mt-2 text-sm font-semibold text-zinc-500">
          {copy.body}
        </p>
        <a
          href={href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-amber-500 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-amber-600"
        >
          {copy.cta}
        </a>
      </section>
    );
  }

  return (
    <section className="my-8 w-full rounded-[28px] border border-[var(--border)] bg-[var(--card)] px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
            {copy.badge}
          </div>
          <h2 className="text-lg font-semibold safari-no-faux-bold">{copy.title}</h2>
          <p className="mt-1 text-sm font-semibold text-zinc-500">{copy.body}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex min-w-[160px] items-center justify-center rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-amber-600"
        >
          {copy.cta}
        </a>
      </div>
    </section>
  );
}
