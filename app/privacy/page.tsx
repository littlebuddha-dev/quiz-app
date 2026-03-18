import type { Metadata } from 'next';
import PrivacyPageClient from './PrivacyPageClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Cueのプライバシーポリシー',
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
