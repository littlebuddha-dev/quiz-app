// Path: app/components/SubscribeButton.tsx
// Title: Subscribe Button Component
// Purpose: Client component to subscribe to a channel

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscribeButton({ channelId, initialSubscribed, isLoggedIn }: { channelId: string, initialSubscribed: boolean, isLoggedIn: boolean }) {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      alert('チャンネル登録するにはログインが必要です');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        setIsSubscribed(data.subscribed);
        router.refresh();
      } else {
        alert('エラーが発生しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  if (isSubscribed) {
    return (
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
      >
        {loading ? '処理中...' : '登録済み'}
      </button>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
    >
      {loading ? '処理中...' : 'チャンネル登録'}
    </button>
  );
}
