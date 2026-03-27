'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from './Header';
import CorrectEffect from './CorrectEffect';
import { Locale } from '../types';
import { usePreferredLocale } from '../hooks/usePreferredLocale';
import { buildGentleExplanation } from '@/lib/explanation-mode';
import LatexRenderer from './LatexRenderer';

interface Quiz {
  type: 'TEXT' | 'CHOICE';
  title: string;
  question: string;
  hint: string;
  answer: string;
  explanation: string;
  options?: string[];
  imageUrl: string;
}

type QuizGeneratorResponse = Quiz & {
  message?: string;
};

export default function IntegratedQuizBoard() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [gradeLevel, setGradeLevel] = useState('中学年（3-4年）');
  const [topic, setTopic] = useState('ロボット');
  const { locale, setLocale } = usePreferredLocale();
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCorrectEffect, setShowCorrectEffect] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [explanationMode, setExplanationMode] = useState<'gentle' | 'full'>('gentle');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const generateQuiz = async () => {
    setLoading(true);
    setShowHint(false);
    setShowAnswer(false);
    setExplanationMode('gentle');
    try {
      const res = await fetch('/api/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, gradeLevel, locale }),
      });
      
      const data = (await res.json()) as any;
      if (!res.ok) {
        const detail = data.details ? ` (${data.details})` : '';
        alert(data.message || `クイズの生成に失敗しました。(Status: ${res.status}${detail})`);
        setQuiz(null);
      } else {
        setQuiz(data);
      }
    } catch (error: any) {
      console.error(error);
      alert(`通信エラーが発生しました。インターネット接続を確認してください。\n${error.message || ''}`);
      setQuiz(null);
    }
    setLoading(false);
  };

  if (!mounted) return null;

  const gentleExplanation = quiz ? buildGentleExplanation(locale, quiz.answer, quiz.explanation) : '';
  const displayedExplanation = explanationMode === 'gentle' ? gentleExplanation : quiz?.explanation;

  return (
    <div className="flex flex-col items-center bg-zinc-100 min-h-screen text-zinc-900">
      <Header 
        locale={locale as Locale} 
        setLocale={(l) => setLocale(l)}
        hideSearch={true}
      />
      
      <div className="pt-[calc(var(--header-height)+2rem)] pb-8 px-8 w-full flex flex-col items-center">
        <div className="mb-10 flex flex-wrap gap-4 bg-white p-6 rounded-2xl shadow-lg border border-zinc-200 w-full max-w-6xl">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="border border-zinc-300 p-2 rounded-lg text-black focus:outline-none focus:border-amber-500"
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="border border-zinc-300 p-2 rounded-lg text-black focus:outline-none focus:border-amber-500"
          >
            <option>低学年（1-2年）</option>
            <option>中学年（3-4年）</option>
            <option>高学年（5-6年）</option>
          </select>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="border border-zinc-300 p-2 rounded-lg text-black focus:outline-none focus:border-amber-500 flex-1"
            placeholder="テーマ（動物など）"
          />
          <button
            onClick={generateQuiz}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold px-8 py-2 rounded-lg transition-colors shadow"
          >
            {loading ? '考え中...' : 'クイズを作成！'}
          </button>
        </div>

        {quiz && (
          <div className="flex flex-col gap-6 w-full max-w-6xl">
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-900">
              <Image
                src={quiz.imageUrl}
                alt="Generated Quiz"
                fill
                className="object-cover"
              />

            </div>

            {/* 詳細な問題文を表示 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-zinc-200">
              <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-amber-500 rounded-full"></span>
                {locale === 'ja' ? 'もんだい' : locale === 'en' ? 'Question' : '问题'}
              </h3>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 mb-4 leading-tight">
                {quiz.title}
              </h2>
              <p className="text-zinc-800 font-bold text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap">
                {quiz.question}
              </p>
            </div>

            {/* 選択肢の表示 (選択式の場合) */}
            {quiz.type === 'CHOICE' && quiz.options && quiz.options.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {quiz.options.map((opt, i) => (
                  <div key={i} className="bg-white border-2 border-zinc-200 p-4 rounded-xl font-bold text-zinc-700 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm">{i + 1}</span>
                    <LatexRenderer text={opt} />
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-200">
                <button type="button" onClick={() => setShowHint(!showHint)} className="w-full text-left flex justify-between items-center mb-3">
                  <h3 className="text-xl font-extrabold text-amber-800">💡 ヒント</h3>
                  <span className="text-sm text-zinc-500">{showHint ? '隠す' : '表示'}</span>
                </button>
                {showHint && <p className="text-zinc-800 font-bold text-lg leading-relaxed">{quiz.hint}</p>}
              </div>
              <div className="bg-green-50 p-6 rounded-2xl shadow-lg border-2 border-green-500">
                <button type="button" onClick={() => setShowAnswer(!showAnswer)} className="w-full text-left flex justify-between items-center mb-3">
                  <h3 className="text-xl font-extrabold text-green-900">✅ こたえ</h3>
                  <span className="text-sm text-zinc-500">{showAnswer ? '隠す' : '表示'}</span>
                </button>
                {showAnswer && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-zinc-800 font-bold text-2xl leading-relaxed mb-4">{quiz.answer}</p>
                    {quiz.explanation && (
                      <div className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-400 mb-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                          <h4 className="text-amber-900 font-extrabold text-sm">🧐 {locale === 'ja' ? '解説' : locale === 'en' ? 'Explanation' : '解析'}</h4>
                          <div className="inline-flex rounded-full border border-amber-200 overflow-hidden bg-white/80">
                            <button
                              type="button"
                              onClick={() => setExplanationMode('gentle')}
                              className={`px-3 py-1 text-[11px] font-black transition-colors ${
                                explanationMode === 'gentle' ? 'bg-amber-500 text-white' : 'text-amber-900'
                              }`}
                            >
                              {locale === 'ja' ? 'やさしい版' : locale === 'en' ? 'Simple' : '简明版'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExplanationMode('full')}
                              className={`px-3 py-1 text-[11px] font-black transition-colors ${
                                explanationMode === 'full' ? 'bg-amber-500 text-white' : 'text-amber-900'
                              }`}
                            >
                              {locale === 'ja' ? 'しっかり版' : locale === 'en' ? 'Detailed' : '详细版'}
                            </button>
                          </div>
                        </div>
                        <p className="text-zinc-700 text-sm leading-relaxed">{displayedExplanation || quiz.explanation}</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCorrectEffect(true)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="text-xl">⭕</span> できた！
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAnswer(false)}
                        className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-600 font-bold py-3 rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="text-xl">❌</span> またこんど
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <CorrectEffect 
        isVisible={showCorrectEffect} 
        onClose={() => setShowCorrectEffect(false)}
        message={locale === 'ja' ? 'やったね！だいせいかい！' : locale === 'en' ? 'You did it! Correct!' : '太棒了！答对了！'}
        score={locale === 'ja' ? 'そのちょうし！' : locale === 'en' ? 'Keep it up!' : '继续加油！'}
        btnLabel={locale === 'ja' ? '閉じる' : locale === 'en' ? 'Close' : '关闭'}
      />
    </div>
  );
}
