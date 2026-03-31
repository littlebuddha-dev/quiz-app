import type { Metadata } from 'next';
import PrivacyContent from './PrivacyContent';
import { getServerLocale } from '@/lib/locale-server';
import { getLocalizedPageMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return getLocalizedPageMetadata(locale, {
    ja: {
      title: 'プライバシーポリシー',
      description: 'Cueのプライバシーポリシー',
    },
    en: {
      title: 'Privacy Policy',
      description: "Cue's privacy policy.",
    },
    zh: {
      title: '隐私政策',
      description: 'Cue 的隐私政策。',
    },
  }, '/privacy');
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
