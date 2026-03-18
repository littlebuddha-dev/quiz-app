'use client';

import dynamic from 'next/dynamic';

const TermsContent = dynamic(() => import('./TermsContent'), { ssr: false });

export default function TermsPageClient() {
  return <TermsContent />;
}
