// /Users/Shared/Program/nextjs/quiz-app/app/admin/adsense/page.tsx
// Title: Google AdSense Management Page
// Purpose: Interface for admins to manage AdSense settings

'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { Locale } from '@/app/types';

interface AdSenseSettings {
  enabled: boolean;
  snippet: string;
  slots: {
    home: boolean;
    watch: boolean;
  };
}

export default function AdSenseAdminPage() {
  const [locale, setLocale] = useState<Locale>('ja');
  const [settings, setSettings] = useState<AdSenseSettings>({
    enabled: false,
    snippet: '',
    slots: {
      home: true,
      watch: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/adsense')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSettings(data);
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
    } catch (err) {
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
      <Header locale={locale} setLocale={setLocale} hideSearch />
      
      <main className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Google AdSense 管理</h1>
          <p className="text-zinc-500">広告の表示設定とスニペットを管理します。</p>
        </div>

        <div className="grid gap-6">
          {/* 有効・無効トグル */}
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

          {/* AdSense スニペット */}
          <section className="bg-[var(--card)] rounded-3xl p-6 shadow-xl border border-[var(--border)]">
            <h2 className="text-xl font-bold mb-4">AdSense スニペット</h2>
            <p className="text-sm text-zinc-500 mb-4">Google AdSense から取得した広告用スクリプトコードを入力してください。</p>
            <textarea
              className="w-full h-48 p-4 bg-zinc-50 dark:bg-zinc-900 border border-[var(--border)] rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              placeholder="<!-- Google AdSense Code -->"
              value={settings.snippet}
              onChange={(e) => setSettings({ ...settings, snippet: e.target.value })}
            ></textarea>
          </section>

          {/* プレイスメント設定 */}
          <section className="bg-[var(--card)] rounded-3xl p-6 shadow-xl border border-[var(--border)]">
            <h2 className="text-xl font-bold mb-4">表示位置の設定</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">ホーム（クイズ一覧）</span>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-amber-500"
                  checked={settings.slots.home}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    slots: { ...settings.slots, home: e.target.checked } 
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">クイズ閲覧ページ</span>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-amber-500"
                  checked={settings.slots.watch}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    slots: { ...settings.slots, watch: e.target.checked } 
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
