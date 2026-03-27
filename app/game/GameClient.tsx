// Path: app/game/GameClient.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Quiz } from '../types';
import LatexRenderer from '../components/LatexRenderer';
import { usePreferredLocale } from '../hooks/usePreferredLocale';
import QuizVisual from '../components/QuizVisual';

const TIME_LIMIT = 10000; // 10 seconds per question

export default function GameClient({ quizzes }: { quizzes: Quiz[] }) {
  const { locale } = usePreferredLocale();
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [textAnswer, setTextAnswer] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTick = useRef<number>(0);

  const startTimer = () => {
    setTimeLeft(TIME_LIMIT);
    lastTick.current = Date.now();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick.current;
      setTimeLeft(prev => {
        const next = Math.max(0, prev - delta);
        if (next === 0) {
          handleTimeout();
        }
        return next;
      });
      lastTick.current = now;
    }, 50); // High frequency for smooth progress bar
  };

  const handleTimeout = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    showFeedback('timeout');
  };

  const startGame = () => {
    setScore(0);
    setCurrentIndex(0);
    setGameState('playing');
    startTimer();
  };

  const showFeedback = (type: 'correct' | 'wrong' | 'timeout') => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback(type);
    
    if (type === 'correct') {
      setScore(s => s + 1);
    }
    
    setTimeout(() => {
      setFeedback(null);
      setTextAnswer('');
      if (currentIndex < quizzes.length - 1) {
        setCurrentIndex(c => c + 1);
        startTimer();
      } else {
        setGameState('result');
      }
    }, 1000); // Wait 1 second before next question
  };

  const normalizeAnswer = (value: string) => value.trim().replace(/\s+/g, '').toLowerCase();

  const handleSubmit = (isCorrect: boolean) => {
    if (feedback !== null) return; // Prevent double submit
    showFeedback(isCorrect ? 'correct' : 'wrong');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== null) return;
    const currentQuiz = quizzes[currentIndex];
    const t = currentQuiz.translations[locale] || currentQuiz.translations['ja'];
    const isCorrect = normalizeAnswer(textAnswer) === normalizeAnswer(t.answer);
    handleSubmit(isCorrect);
  };

  // cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (quizzes.length === 0) {
    return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">クイズがありません</div>;
  }

  const currentQuiz = quizzes[currentIndex];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = currentQuiz?.translations[locale] || currentQuiz?.translations['ja'];
  
  // Merge split LaTeX fragments if they exist (defensive fix for potential serialization/translation issues)
  const mergedOptions = useMemo(() => {
    if (!t || !t.options) return [];
    const merged: string[] = [];
    for (let i = 0; i < t.options.length; i++) {
      let opt = t.options[i];
      // If this option starts a LaTeX block but doesn't close it, try to merge with the next one
      if (opt.includes('$') && (opt.match(/\$/g) || []).length % 2 !== 0 && i + 1 < t.options.length) {
        opt = opt + ' ' + t.options[i + 1];
        i++;
      }
      merged.push(opt);
    }
    return merged;
  }, [t]);

  const displayImageUrl = (t?.imageUrl && t.imageUrl !== "") 
    ? t.imageUrl 
    : (currentQuiz?.imageUrl && currentQuiz.imageUrl !== "") 
      ? currentQuiz.imageUrl 
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center font-sans overflow-hidden select-none">
      
      {gameState === 'intro' && (
        <div className="text-center p-6 animate-in fade-in zoom-in duration-500">
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 drop-shadow-xl">
            TIME ATTACK
          </h1>
          <p className="text-xl md:text-2xl font-bold text-zinc-400 mb-12">
            10問連続！1問10秒以内に答えよ！
          </p>
          <button 
            onClick={startGame}
            className="px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-full text-2xl font-black text-white shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            GAME START
          </button>
          
          <div className="mt-12">
            <Link href="/" className="text-zinc-500 hover:text-white font-bold underline transition-colors cursor-pointer">
              ホームに戻る
            </Link>
          </div>
        </div>
      )}

      {gameState === 'playing' && currentQuiz && (
        <div className="w-full h-screen flex flex-col relative px-4 py-8 md:p-8 max-w-5xl mx-auto">
          {/* Header Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-2xl font-black text-zinc-400">
              Q <span className="text-amber-500 text-3xl">{currentIndex + 1}</span> / 10
            </div>
            <div className="text-2xl font-black text-zinc-400">
              SCORE: <span className="text-emerald-500 text-3xl">{score}</span>
            </div>
          </div>

          {/* Time Bar */}
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mb-8 shadow-inner">
            <div 
              className={`h-full transition-all duration-75 ease-linear ${timeLeft < 3000 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
            />
          </div>

          {/* Question Area */}
          <div className="flex-1 flex flex-col items-center justify-center w-full gap-5 overflow-y-auto">
            {displayImageUrl && (
              <div className="w-full max-w-xl aspect-video relative rounded-3xl overflow-hidden shadow-2xl border-4 border-zinc-800/50">
                <QuizVisual
                  imageUrl={displayImageUrl}
                  alt="Quiz Image"
                  visualMode={t?.visualMode}
                  visualData={t?.visualData}
                  imageClassName="object-cover"
                />
              </div>
            )}
            
            <h2 className="text-2xl md:text-4xl font-extrabold text-center leading-relaxed text-zinc-100 px-4">
              <LatexRenderer text={t.title || ''} />
            </h2>
            <div className="text-lg md:text-xl text-zinc-300 font-bold text-center px-4 max-w-3xl">
              <LatexRenderer text={t.question || ''} />
            </div>
          </div>

          {/* Answer Area */}
          <div className="w-full max-w-3xl mx-auto mt-4 md:mt-8 min-h-[12rem] flex items-center justify-center">
            {t.type === 'CHOICE' && mergedOptions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full" translate="no">
                {mergedOptions.map((opt: string, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => handleSubmit(opt === t.answer)} 
                    disabled={feedback !== null}
                    className="bg-zinc-800/80 hover:bg-zinc-700/80 border-2 border-zinc-700 hover:border-amber-500 font-black py-4 px-4 rounded-2xl transition-all active:scale-[0.98] text-center text-lg md:text-xl shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    <LatexRenderer text={opt} />
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="flex flex-col sm:flex-row gap-4 w-full">
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={feedback !== null}
                  autoFocus
                  placeholder="答えを入力..."
                  className="flex-1 bg-zinc-800/80 border-2 border-zinc-700 p-4 md:p-5 rounded-2xl font-black text-xl md:text-2xl focus:outline-none focus:border-amber-500 shadow-lg disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={feedback !== null || !textAnswer.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white font-black py-4 px-10 rounded-2xl transition-colors text-xl md:text-2xl shadow-lg cursor-pointer"
                >
                  決定
                </button>
              </form>
            )}
          </div>

          {/* Feedback Overlay */}
          {feedback && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              {feedback === 'correct' && (
                <div className="text-9xl animate-bounce filter drop-shadow-[0_0_50px_rgba(34,197,94,0.8)]">⭕️</div>
              )}
              {feedback === 'wrong' && (
                <div className="text-9xl text-red-500 animate-in zoom-in duration-200 drop-shadow-[0_0_50px_rgba(239,68,68,0.8)]">❌</div>
              )}
              {feedback === 'timeout' && (
                <div className="font-black text-6xl md:text-8xl text-red-500 tracking-widest drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] rotate-[-10deg]">TIME UP</div>
              )}
            </div>
          )}
        </div>
      )}

      {gameState === 'result' && (
        <div className="text-center p-6 animate-in slide-in-from-bottom-10 duration-700">
          <h2 className="text-4xl md:text-6xl font-black mb-4 text-zinc-300">RESULT</h2>
          <div className="text-8xl md:text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-2xl mb-12">
            {score} <span className="text-5xl text-zinc-600">/ 10</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xl font-bold transition-all shadow-lg min-w-[200px] cursor-pointer"
            >
              もう一度プレイ
            </button>
            <Link 
              href="/"
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-full text-xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] min-w-[200px] cursor-pointer"
            >
              ホームへ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
