'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { usePreferredLocale } from '@/app/hooks/usePreferredLocale';
import type { AdSenseSettings } from '@/lib/adsense';
import { DEFAULT_ADSENSE_SETTINGS } from '@/lib/adsense';

type AdSenseAdminClientProps = {
  userStatus: { xp: number; level: number; role: string };
};

export default function AdSenseAdminClient({ userStatus }: AdSenseAdminClientProps) {
  const { locale, setLocale } = usePreferredLocale();
  const [settings, setSettings] = useState<AdSenseSettings>(DEFAULT_ADSENSE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/adsense')
      .then((res) => res.json())
      .then((data) => {
        const parsed = data as AdSenseSettings & { error?: string };
        if (!parsed.error) {
          setSettings((prev) => ({
            ...prev,
            ...parsed,
            slots: {
              home: { ...prev.slots.home, ...parsed.slots?.home },
              watch: { ...prev.slots.watch, ...parsed.slots?.watch },
            },
          }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/adsense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage('設定を保存しました。');
      } else {
        setMessage('保存に失敗しました。');
      }
    } catch {
      setMessage('保存中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pt-20 pb-12 px-4 sm:px-6">
      <Header locale={locale} setLocale={setLocale} userStatus={userStatus} hideSearch />

      <main className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Google AdSense 管理</h1>
          <p className="text-zinc-500">広告の表示設定とスニペットを管理します。</p>
        </div>

        <div className="grid gap-6">
          <section className="bg-[var(--card)] rounded-3xl p-6 shadow-xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold mb-1">広告表示</h2>
                <p className="text-sm text-zinc-500">サイト全体での広告表示をオン/オフします。</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                />
                <div className="w-14 h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </section>

          <section className="bg-[var(--card)] rounded-3xl p-6 shadow-xl border border-[var(--border)]">
            <h2 className="text-xl font-bold mb-4">AdSense アカウント設定</h2>
            <p className="text-sm text-zinc-500 mb-4">AdSense の公開者 ID と、表示位置ごとの広告スロット ID を入力してください。</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">公開者 ID</label>
                <input
                  type="text"
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-[var(--border)] rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  placeholder="ca-pub-1234567890123456"
                  value={settings.clientId}
                  onChange={(e) => setSettings({ ...settings, clientId: e.target.value.trim() })}
                />
              </div>
              <p className="text-xs text-zinc-500">
                以前のスニペット直貼り方式より安全で安定した運用に切り替えています。公開者 ID は `ca-pub-...` の形式です。
              </p>
            </div>
          </section>

          <section className="bg-[var(--card)] rounded-3xl p-6 shadow-xl border border-[var(--border)]">
            <h2 className="text-xl font-bold mb-4">表示位置の設定</h2>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">ホーム（クイズ一覧）</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-amber-500"
                    checked={settings.slots.home.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      slots: { ...settings.slots, home: { ...settings.slots.home, enabled: e.target.checked } }
                    })}
                  />
                </div>
                <input
                  type="text"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-[var(--border)] rounded-2xl font-mono text-sm"
                  placeholder="ホーム広告スロット ID"
                  value={settings.slots.home.slotId}
                  onChange={(e) => setSettings({
                    ...settings,
                    slots: { ...settings.slots, home: { ...settings.slots.home, slotId: e.target.value.trim() } }
                  })}
                />
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">クイズ閲覧ページ</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-amber-500"
                    checked={settings.slots.watch.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      slots: { ...settings.slots, watch: { ...settings.slots.watch, enabled: e.target.checked } }
                    })}
                  />
                </div>
                <input
                  type="text"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-[var(--border)] rounded-2xl font-mono text-sm"
                  placeholder="閲覧ページ広告スロット ID"
                  value={settings.slots.watch.slotId}
                  onChange={(e) => setSettings({
                    ...settings,
                    slots: { ...settings.slots, watch: { ...settings.slots.watch, slotId: e.target.value.trim() } }
                  })}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col items-center gap-4 mt-4">
            {message && (
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${message.includes('失敗') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {message}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-64 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? '保存中...' : '設定を保存する'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
