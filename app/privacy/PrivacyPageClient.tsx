'use client';

import dynamic from 'next/dynamic';

const PrivacyContent = dynamic(() => import('./PrivacyContent'), { ssr: false });

export default function PrivacyPageClient() {
  return <PrivacyContent />;
}
