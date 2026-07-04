'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AffiliatePlacement,
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

export default function AmazonAffiliate({
  slot,
  locale,
  title,
  category,
  question,
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
      marketplace: settings.marketplace,
      associateTag: settings.associateTag,
      keywords,
    });
  }, [keywords, settings]);

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
