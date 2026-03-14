// /Users/Shared/Program/nextjs/quiz-app/app/onboarding/OnboardingClient.tsx
// Title: Onboarding Client Component
// Purpose: Interactive form for new users to set their profile.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function OnboardingClient({ initialData, categories }: any) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    birthDate: '',
    preferredCategories: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(id)
        ? prev.preferredCategories.filter(c => c !== id)
        : [...prev.preferredCategories, id]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.birthDate) {
      alert('生年月日を入力してください');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        alert('保存に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4" suppressHydrationWarning>
      {!mounted ? (
        <div className="max-w-md w-full bg-[var(--card)] rounded-[2.5rem] shadow-2xl border border-[var(--border)] p-8 sm:p-12 relative overflow-hidden h-[600px] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-md w-full bg-[var(--card)] rounded-[2.5rem] shadow-2xl border border-[var(--border)] p-8 sm:p-12 relative overflow-hidden">
          {/* 背景の装飾 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full -ml-16 -mb-16 blur-3xl" />

          <div className="relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-amber-500/20 mb-4 animate-bounce">Q</div>
              <h1 className="text-2xl font-black tracking-tight text-center">Cueへようこそ！</h1>
              <p className="text-zinc-500 text-sm font-bold mt-2">あなたにぴったりのクイズをお届けします</p>
            </div>

            {/* ステップ 1: 基本情報 */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">お名前（ニックネーム）</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例：たろう"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-6 py-4 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">生年月日</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-6 py-4 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 font-bold ml-1">※年齢に合わせて最適な問題が表示されるようになります。</p>
                </div>
                <button
                  onClick={handleNext}
                  disabled={!formData.birthDate}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 text-white font-black py-5 rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 text-lg"
                >
                  次へ
                </button>
              </div>
            )}

            {/* ステップ 2: 興味のあるカテゴリー */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">興味のあるジャンル（複数選択可）</label>
                  <div className="grid grid-cols-2 gap-3 py-2">
                    {categories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-4 py-3 rounded-xl border-2 font-black text-sm transition-all ${formData.preferredCategories.includes(cat.id)
                          ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-transparent border-[var(--border)] text-zinc-400 hover:border-amber-200'
                          }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleBack}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 text-white font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {loading ? '保存中...' : 'はじめる！'}
                  </button>
                </div>
              </div>
            )}

            {/* プログレスドット */}
            <div className="flex justify-center gap-2 mt-8">
              <div className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'w-6 bg-amber-500' : 'bg-zinc-200'}`} />
              <div className={`w-2 h-2 rounded-full transition-all ${step === 2 ? 'w-6 bg-amber-500' : 'bg-zinc-200'}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
