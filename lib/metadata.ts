import type { Locale } from '@/app/types';
import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site-config';

type LocalizedText = Record<Locale, string>;

export const SITE_NAME = 'Cue';

const ROOT_TITLE: LocalizedText = {
  ja: 'Cue | すべての人に学ぶことの楽しさを',
  en: 'Cue | Make Learning Fun for Everyone',
  zh: 'Cue | 让每个人都享受学习的乐趣',
};

const ROOT_DESCRIPTION: LocalizedText = {
  ja: 'Cueは「すべての人に学ぶことの楽しさを伝えたい」という想いから生まれた、直感的なクイズプラットフォームです。論理的パズルや多言語クイズを通じて、知的好奇心を刺激する新しい学習体験を提供します。',
  en: 'Cue is an intuitive quiz platform built to make learning enjoyable for everyone, with logic puzzles and multilingual quizzes that spark curiosity.',
  zh: 'Cue 是一个直观的测验平台，通过逻辑谜题和多语言问答激发好奇心，让每个人都能享受学习的乐趣。',
};

const OG_LOCALE: Record<Locale, string> = {
  ja: 'ja_JP',
  en: 'en_US',
  zh: 'zh_CN',
};

const DEFAULT_OG_IMAGE_PATH = '/og-image.png';

export function getAbsoluteUrl(path = '') {
  const siteUrl = getSiteUrl();
  if (!path) return siteUrl;
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith('/') ? path : `/${path}`, siteUrl).toString();
}

export function resolveMetadataImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;
  return getAbsoluteUrl(trimmed);
}

export function getDefaultOgImageUrl() {
  return getAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);
}

export function getRootMetadata(locale: Locale): Metadata {
  const title = ROOT_TITLE[locale];
  const description = ROOT_DESCRIPTION[locale];
  const canonical = getAbsoluteUrl('/');
  const ogImageUrl = getDefaultOgImageUrl();

  return {
    metadataBase: new URL(getSiteUrl()),
    manifest: '/manifest.webmanifest',
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    alternates: {
      canonical,
    },
    keywords: ['クイズ', '学習', '論理的思考', '知育', '学びの楽しさ', '多言語学習', 'パズル', 'Cue'],
    authors: [{ name: 'Cue Team' }],
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale],
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Cue - Learn with Fun',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
  };
}

export function getLocalizedPageMetadata(
  locale: Locale,
  values: Record<Locale, { title: string; description: string }>,
  pathname = '/'
): Metadata {
  const selected = values[locale] ?? values.ja;
  const canonical = getAbsoluteUrl(pathname);
  const ogImageUrl = getDefaultOgImageUrl();

  return {
    title: selected.title,
    description: selected.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale],
      url: canonical,
      siteName: SITE_NAME,
      title: selected.title,
      description: selected.description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: selected.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: selected.title,
      description: selected.description,
      images: [ogImageUrl],
    },
  };
}
