import type { Metadata } from 'next';
import ContactContent from './ContactContent';
import { getServerLocale } from '@/lib/locale-server';
import { getLocalizedPageMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return getLocalizedPageMetadata(locale, {
    ja: {
      title: 'お問い合わせ',
      description: 'Cueへのお問い合わせ',
    },
    en: {
      title: 'Contact',
      description: 'Contact Cue for support, requests, or feedback.',
    },
    zh: {
      title: '联系我们',
      description: '联系 Cue，获取支持、咨询或反馈。',
    },
  }, '/contact');
}

export default function ContactPage() {
  return <ContactContent />;
}
