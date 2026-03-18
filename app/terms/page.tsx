import type { Metadata } from 'next';
import TermsPageClient from './TermsPageClient';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Cueの利用規約',
};

export default function TermsPage() {
  return <TermsPageClient />;
}
