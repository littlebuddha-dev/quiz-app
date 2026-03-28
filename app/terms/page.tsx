import type { Metadata } from 'next';
import TermsContent from './TermsContent';
import { getServerLocale } from '@/lib/locale-server';
import { getLocalizedPageMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return getLocalizedPageMetadata(locale, {
    ja: {
      title: '利用規約',
      description: 'Cueの利用規約',
    },
    en: {
      title: 'Terms of Service',
      description: "Cue's terms of service.",
    },
    zh: {
      title: '使用条款',
      description: 'Cue 的使用条款。',
    },
  });
}

export default function TermsPage() {
  return <TermsContent />;
}
