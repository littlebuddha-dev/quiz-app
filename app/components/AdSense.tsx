// /Users/Shared/Program/nextjs/quiz-app/app/components/AdSense.tsx
// Title: Google AdSense Component
// Purpose: Loads AdSense once and renders stable ad units for public visitors.

'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { AdPlacement, PublicAdSenseSettings } from '@/lib/adsense';

interface AdSenseProps {
  slot: AdPlacement;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdSense({ slot }: AdSenseProps) {
  const [settings, setSettings] = useState<PublicAdSenseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const adUnitId = useId();

  useEffect(() => {
    fetch('/api/admin/adsense')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data as PublicAdSenseSettings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const slotSettings = settings?.slots[slot];
  const canRenderAd = useMemo(
    () => !!settings?.enabled && !!settings.clientId && !!slotSettings?.enabled && !!slotSettings.slotId,
    [settings, slotSettings]
  );

  useEffect(() => {
    if (!canRenderAd) {
      return;
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.error('AdSense render failed:', error);
    }
  }, [adUnitId, canRenderAd]);

  if (loading || !canRenderAd || !settings || !slotSettings) {
    return null;
  }

  return (
    <div className="adsense-container my-8 flex justify-center w-full" data-slot={slot}>
      <ins
        key={adUnitId}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', maxWidth: '960px', minHeight: '120px' }}
        data-ad-client={settings.clientId}
        data-ad-slot={slotSettings.slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
