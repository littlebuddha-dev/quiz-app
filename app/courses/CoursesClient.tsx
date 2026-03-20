'use client';

import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePreferredLocale } from '../hooks/usePreferredLocale';
import type { CourseProgress } from '@/lib/learning';
import { CURRICULUM_SOURCE_LABELS, CURRICULUM_SOURCE_LINKS } from '@/lib/learning';

type CoursesClientProps = {
  currentCourse: CourseProgress;
  roadmap: CourseProgress[];
};

const COPY = {
  ja: {
    hero: '学年別の連続学習コース',
    body: '日本の学習指導要領をベースに、今の年齢で押さえたい内容を連続コースとして整理しました。',
    current: 'いまのおすすめコース',
    roadmap: '学年ロードマップ',
    progress: '進捗',
    available: '挑戦できる問題',
    solved: 'クリア済み',
    curriculum: '学習指導要領ベースの到達テーマ',
    start: 'この分野に挑戦',
    source: '参照',
    noQuiz: 'この分野の問題はまだ少なめです。AI自動生成で増やしていく前提の土台として表示しています。',
  },
  en: {
    hero: 'Grade-Based Learning Courses',
    body: 'These course paths organize what to focus on next using the Japanese national curriculum as a base.',
    current: 'Recommended now',
    roadmap: 'Grade roadmap',
    progress: 'Progress',
    available: 'Available quizzes',
    solved: 'Solved',
    curriculum: 'Curriculum-aligned themes',
    start: 'Start this subject',
    source: 'Source',
    noQuiz: 'There are still only a few quizzes in this subject. The course map is ready as the foundation for further auto-generation.',
  },
  zh: {
    hero: '按学年连续学习课程',
    body: '以日本学习指导要领为基础，把当前年龄阶段应掌握的内容整理成连续课程。',
    current: '当前推荐课程',
    roadmap: '学年路线图',
    progress: '进度',
    available: '可挑战题目',
    solved: '已完成',
    curriculum: '基于课程标准的学习主题',
    start: '开始这个领域',
    source: '参考',
    noQuiz: '这个领域的题目还不多，当前页面先作为后续自动生成扩充的课程骨架。',
  },
} as const;

export default function CoursesClient({ currentCourse, roadmap }: CoursesClientProps) {
  const { locale, setLocale } = usePreferredLocale();
  const t = COPY[locale];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header locale={locale} setLocale={setLocale} hideSearch />

      <main className="pt-24 max-w-6xl mx-auto px-4 pb-12">
        <section className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xl shadow-black/5">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">
            Course Path
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">{t.hero}</h1>
          <p className="text-sm sm:text-base font-semibold text-zinc-500 max-w-3xl">{t.body}</p>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black">{t.current}</h2>
            <a
              href={CURRICULUM_SOURCE_LINKS[currentCourse.course.sourceLevel]}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-black text-amber-600 hover:underline"
            >
              {t.source}: {CURRICULUM_SOURCE_LABELS[currentCourse.course.sourceLevel]}
            </a>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 shadow-xl shadow-black/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">
                  {currentCourse.course.label}
                </div>
                <p className="text-sm font-semibold text-zinc-500 max-w-3xl">{currentCourse.course.overview}</p>
              </div>
              <div className="min-w-[180px]">
                <div className="flex items-center justify-between text-xs font-black text-zinc-500 mb-2">
                  <span>{t.progress}</span>
                  <span>{currentCourse.progress}%</span>
                </div>
                <div className="h-3 rounded-full bg-zinc-200 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${currentCourse.progress}%` }} />
                </div>
                <div className="mt-2 text-xs font-bold text-zinc-500">
                  {t.solved}: {currentCourse.totalSolvedQuizCount} / {t.available}: {currentCourse.totalAvailableQuizCount}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentCourse.subjects.map((subjectProgress) => (
                <div key={subjectProgress.subject.id} className="rounded-3xl border border-[var(--border)] bg-white/70 dark:bg-zinc-900/30 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-black">{subjectProgress.subject.label}</h3>
                      <p className="text-xs font-semibold text-zinc-500 mt-1">{subjectProgress.subject.officialFocus}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-amber-600">{subjectProgress.progress}%</div>
                      <div className="text-[11px] font-bold text-zinc-400">
                        {subjectProgress.solvedQuizCount}/{subjectProgress.availableQuizCount}
                      </div>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-zinc-200 overflow-hidden mb-4">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${subjectProgress.progress}%` }} />
                  </div>

                  <div className="mb-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">{t.curriculum}</div>
                    <div className="flex flex-wrap gap-2">
                      {subjectProgress.subject.strands.map((strand) => (
                        <span key={strand} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold text-zinc-600">
                          {strand}
                        </span>
                      ))}
                    </div>
                  </div>

                  {subjectProgress.categoryIds[0] ? (
                    <Link
                      href={`/?category=${subjectProgress.categoryIds[0]}`}
                      className="inline-flex rounded-full bg-zinc-900 text-white px-4 py-2 text-xs font-black hover:bg-zinc-800 transition-colors"
                    >
                      {t.start}
                    </Link>
                  ) : (
                    <div className="text-xs font-semibold text-zinc-500">{t.noQuiz}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-black mb-4">{t.roadmap}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roadmap.map((courseProgress) => (
              <div key={courseProgress.course.id} className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg shadow-black/5">
                <div className="text-sm font-black mb-1">{courseProgress.course.label}</div>
                <p className="text-xs font-semibold text-zinc-500 mb-4 line-clamp-3">{courseProgress.course.overview}</p>
                <div className="flex items-center justify-between text-xs font-black text-zinc-500 mb-2">
                  <span>{t.progress}</span>
                  <span>{courseProgress.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${courseProgress.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
