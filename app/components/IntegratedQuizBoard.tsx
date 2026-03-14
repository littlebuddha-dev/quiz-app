'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from './Header';
import { Locale } from '../types';
import CorrectEffect from './CorrectEffect';

interface Quiz {
  question: string;
  hint: string;
  answer: string;
  imageUrl: string;
}

export default function IntegratedQuizBoard() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [gradeLevel, setGradeLevel] = useState('中学年（3-4年）');
  const [topic, setTopic] = useState('ロボット');
  const [locale, setLocale] = useState<Locale>('ja');
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCorrectEffect, setShowCorrectEffect] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateQuiz = async () => {
    setLoading(true);
    setShowHint(false);
    setShowAnswer(false);
    try {
      const res = await fetch('/api/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, gradeLevel, locale }),
      });
      const data = (await res.json()) as any;
      setQuiz(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center bg-zinc-100 min-h-screen text-zinc-900">
      <Header 
        locale={locale as Locale} 
        setLocale={(l) => setLocale(l)}
        hideSearch={true}
      />
      
      <div className="pt-24 pb-8 px-8 w-full flex flex-col items-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-200">
                <button onClick={() => setShowHint(!showHint)} className="w-full text-left flex justify-between items-center mb-3">
                  <h3 className="text-xl font-extrabold text-amber-800">💡 ヒント</h3>
                  <span className="text-sm text-zinc-500">{showHint ? '隠す' : '表示'}</span>
                </button>
                {showHint && <p className="text-zinc-800 font-bold text-lg leading-relaxed">{quiz.hint}</p>}
              </div>
              <div className="bg-green-50 p-6 rounded-2xl shadow-lg border-2 border-green-500">
                <button onClick={() => setShowAnswer(!showAnswer)} className="w-full text-left flex justify-between items-center mb-3">
                  <h3 className="text-xl font-extrabold text-green-900">✅ こたえ</h3>
                  <span className="text-sm text-zinc-500">{showAnswer ? '隠す' : '表示'}</span>
                </button>
                {showAnswer && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-zinc-800 font-bold text-2xl leading-relaxed mb-6">{quiz.answer}</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowCorrectEffect(true)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="text-xl">⭕</span> できた！
                      </button>
                      <button 
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