// /Users/Shared/Program/nextjs/quiz-app/app/components/AdSense.tsx
// Title: Google AdSense Component
// Purpose: Dynamically renders AdSense script from settings

'use client';

import React, { useEffect, useState } from 'react';

interface AdSenseProps {
  slot: 'home' | 'watch';
}

export default function AdSense({ slot }: AdSenseProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/adsense')
      .then((res) => res.json())
      .then((data: any) => { // Cast 'data' to 'any'
        if (!data.error) {
          setSettings(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !settings || !settings.enabled || !settings.slots[slot] || !settings.snippet) {
    return null;
  }

  // snippet を dangerouslySetInnerHTML で挿入する
  // 注: AdSense のスクリプトは通常一度読み込めば良いため、
  // 実際には <head> に一度挿入し、広告ユニットを別途配置する方が一般的ですが、
  // ユーザーの「スニペットを記載する欄をつくり、管理出来るようにしてください」
  // という要望に合わせ、管理画面で入力されたコードをそのまま実行可能な形で差し込みます。

  return (
    <div 
      className="adsense-container my-8 flex justify-center w-full"
      dangerouslySetInnerHTML={{ __html: settings.snippet }} 
    />
  );
}
