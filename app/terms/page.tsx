import type { Metadata } from 'next';
import TermsContent from './TermsContent';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Cueの利用規約',
};

export default function TermsPage() {
  return <TermsContent />;
}
