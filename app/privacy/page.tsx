import type { Metadata } from 'next';
import PrivacyContent from './PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Cueのプライバシーポリシー',
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
