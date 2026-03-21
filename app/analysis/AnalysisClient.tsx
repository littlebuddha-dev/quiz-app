'use client';

import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePreferredLocale } from '../hooks/usePreferredLocale';
import type { AbilityDomainScore } from '@/lib/learning';
import { getAbilityDomainText } from '@/lib/learning';

type WeakCategory = {
  categoryId: string;
  label: string;
  labelEn?: string | null;
  labelZh?: string | null;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
};

type AnalysisClientProps = {
  userStatus?: { xp: number; level: number; role: string };
  totalAttempts: number;
  uniqueSolved: number;
  overallAccuracy: number;
  activeDays14: number;
  domainScores: AbilityDomainScore[];
  weakCategories: WeakCategory[];
};

const COPY = {
  ja: {
    hero: '学習分析',
    body: '履歴から、得意・不得意と学習習慣を見える化します。',
    attempts: '総挑戦数',
    solved: 'クリアした問題',
    accuracy: '全体正答率',
    days: '直近14日の学習日数',
    strengths: '能力ドメイン',
    weaknesses: '重点復習カテゴリ',
    attemptsLabel: '挑戦',
    suggest: 'この分野を復習',
    noHistory: 'まだ十分な履歴がありません。数問解くと、苦手なカテゴリがここに表示されます。',
  },
  en: {
    hero: 'Learning Analysis',
    body: 'See your strengths, weak points, and learning habits from your history.',
    attempts: 'Total attempts',
    solved: 'Unique clears',
    accuracy: 'Overall accuracy',
    days: 'Active days in last 14 days',
    strengths: 'Ability domains',
    weaknesses: 'Priority review categories',
    attemptsLabel: 'Attempts',
    suggest: 'Review this topic',
    noHistory: 'There is not enough history yet. Solve a few more quizzes and your weaker categories will appear here.',
  },
  zh: {
    hero: '学习分析',
    body: '根据你的历史记录，把优势、薄弱点和学习习惯可视化。',
    attempts: '总作答数',
    solved: '已完成题目',
    accuracy: '整体正确率',
    days: '最近14天学习天数',
    strengths: '能力维度',
    weaknesses: '重点复习分类',
    attemptsLabel: '作答',
    suggest: '复习这个领域',
    noHistory: '目前还没有足够的记录。先多做几道题，这里就会显示你的薄弱分类。',
  },
} as const;

export default function AnalysisClient({
  userStatus,
  totalAttempts,
  uniqueSolved,
  overallAccuracy,
  activeDays14,
  domainScores,
  weakCategories,
}: AnalysisClientProps) {
  const { locale, setLocale } = usePreferredLocale();
  const t = COPY[locale];

  const sortedDomains = [...domainScores].sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header locale={locale} setLocale={setLocale} userStatus={userStatus} hideSearch />

      <main className="pt-24 max-w-6xl mx-auto px-4 pb-12">
        <section className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">
            {locale === 'ja' ? '学習分析' : locale === 'en' ? 'Analytics' : '学习分析'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">{t.hero}</h1>
          <p className="text-sm sm:text-base font-semibold text-zinc-500">{t.body}</p>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: t.attempts, value: totalAttempts },
            { label: t.solved, value: uniqueSolved },
            { label: t.accuracy, value: `${overallAccuracy}%` },
            { label: t.days, value: activeDays14 },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">{item.label}</div>
              <div className="text-2xl sm:text-3xl font-black">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-xl sm:text-2xl font-black mb-5">{t.strengths}</h2>
            <div className="space-y-4">
              {sortedDomains.map((score) => (
                <div key={score.domain.id} className="rounded-3xl border border-[var(--border)] bg-white/70 dark:bg-zinc-900/30 p-4">
                  {(() => {
                    const domainText = getAbilityDomainText(locale, score.domain.id, score.domain.label, score.domain.description);
                    return (
                      <>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div>
                            <div className="font-black">{domainText.label}</div>
                            <div className="text-xs font-semibold text-zinc-500 mt-1">{domainText.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-amber-600">{score.accuracy}%</div>
                            <div className="text-[11px] font-bold text-zinc-400">{t.attemptsLabel}: {score.totalAttempts}</div>
                          </div>
                        </div>
                        <div className="h-3 rounded-full bg-zinc-200 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${score.accuracy}%` }} />
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-xl sm:text-2xl font-black mb-5">{t.weaknesses}</h2>
            <div className="space-y-3">
              {weakCategories.length > 0 ? (
                weakCategories.map((category) => (
                  <Link
                    key={category.categoryId}
                    href={`/?category=${category.categoryId}`}
                    className="block rounded-3xl border border-[var(--border)] bg-white/70 dark:bg-zinc-900/30 p-4 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-black">{locale === 'en' ? category.labelEn || category.label : locale === 'zh' ? category.labelZh || category.label : category.label}</div>
                        <div className="text-xs font-semibold text-zinc-500 mt-1">
                          {t.attemptsLabel}: {category.totalAttempts} · {t.accuracy}: {category.accuracy}%
                        </div>
                      </div>
                      <div className="text-[11px] font-black text-amber-600">{t.suggest}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm font-semibold text-zinc-500">
                  {t.noHistory}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
