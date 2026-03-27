// Path: app/watch/[id]/WatchClient.tsx
// Title: Watch Client Component
// Purpose: Handles the interactive quiz interface, results, comments, and related recommendations on the client side.
'use client';

import { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LatexRenderer from '../../components/LatexRenderer';
import QuizVisual from '../../components/QuizVisual';

// ... (other imports)
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Quiz } from '../../types';
import CorrectEffect from '../../components/CorrectEffect';
import AdSense from '../../components/AdSense';
import { usePreferredLocale } from '../../hooks/usePreferredLocale';
import { buildGentleExplanation } from '@/lib/explanation-mode';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

type WatchComment = {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
};

type RelatedQuiz = {
  id: string;
  title: string;
  imageUrl: string;
  targetAge: number;
  translations: Record<string, { title: string; imageUrl: string | null; options?: string[] }>;
  viewCount?: number;
};

export interface WatchClientProps {
  quiz: Quiz;
  initialComments: WatchComment[];
  initialBookmark: boolean;
  initialLike: boolean;
  initialCleared: boolean;
  isLoggedIn: boolean;
  relatedQuizzes: RelatedQuiz[];
  userStatus?: { xp: number; level: number; role: string };
}

export default function WatchClient({
  quiz,
  initialComments,
  initialBookmark,
  initialLike,
  initialCleared,
  isLoggedIn,
  relatedQuizzes,
  userStatus
}: WatchClientProps) {
  const router = useRouter();
  const { locale, setLocale } = usePreferredLocale();
  const isOnline = useOnlineStatus();
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCorrectEffect, setShowCorrectEffect] = useState(false);
  const [isCleared, setIsCleared] = useState(initialCleared);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmark);
  const [isLiked, setIsLiked] = useState(initialLike);

  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [explanationMode, setExplanationMode] = useState<'gentle' | 'full'>('gentle');
  const quizVisualRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val) {
      router.push(`/?q=${encodeURIComponent(val)}`);
    } else {
      router.push('/');
    }
  };

  // 現在の言語の翻訳を取得。なければ日本語、それもなければ最初の翻訳をフォールバックに。
  const t = quiz.translations[locale] || quiz.translations['ja'] || Object.values(quiz.translations)[0];

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

  if (!t) return null; // 基本的にありえないが、安全のため

  const explanation = t.explanation?.trim();
  const gentleExplanation = buildGentleExplanation(locale, t.answer, explanation);
  const displayedExplanation = explanationMode === 'gentle' ? gentleExplanation : explanation;

  // 画像のフォールバックロジック
  const displayImageUrl = (t.imageUrl && t.imageUrl !== "")
    ? t.imageUrl
    : (quiz.imageUrl && quiz.imageUrl !== "")
      ? quiz.imageUrl
      : 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop';

  const normalizeAnswer = (value: string) =>
    value.trim().replace(/\s+/g, '').toLowerCase();

  const handleAction = async (action: 'bookmark' | 'like') => {
    if (!isOnline) {
      return alert(
        locale === 'ja'
          ? 'オフライン中はこの操作はできません。'
          : locale === 'en'
            ? 'This action is unavailable offline.'
            : '离线状态下无法执行此操作。'
      );
    }

    if (!isLoggedIn) return alert('ログインが必要です');

    if (action === 'bookmark') {
      setIsBookmarked(!isBookmarked);
    }
    if (action === 'like') {
      setIsLiked(!isLiked);
    }

    await fetch('/api/user/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, quizId: quiz.id })
    });
  };

  const handleAnswerSubmit = async (isCorrect: boolean) => {
    setLastResult(isCorrect ? 'correct' : 'incorrect');
    setShowAnswer(true);
    setTextAnswer('');
    setExplanationMode('gentle');

    // ログインしていれば履歴を保存
    if (isCorrect) {
      setShowCorrectEffect(true);
    }

    // クイズ表示エリアへスクロール（モバイル等で回答ボタンが下にある場合を考慮）
    if (quizVisualRef.current) {
      quizVisualRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (isLoggedIn) {
      if (isCorrect && !isCleared) {
        setIsCleared(true);
      }
      await fetch('/api/user/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history', quizId: quiz.id, isCorrect })
      });
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isLoggedIn || !isOnline) return;

    setIsSubmitting(true);
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id, content: newComment })
    });

    if (res.ok) {
      const addedComment = (await res.json()) as { comment: WatchComment };
      setComments([addedComment.comment, ...comments]);
      setNewComment('');
    }
    setIsSubmitting(false);
  };

  const isLatex = (text: string) => {
    const normalized = text.trim()
      .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$');
    return /\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/.test(normalized) || normalized.includes('\\');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <CorrectEffect
        isVisible={showCorrectEffect}
        onClose={() => setShowCorrectEffect(false)}
        message={locale === 'ja' ? 'すばらしい！正解です！' : locale === 'en' ? 'Excellent! Correct!' : '太棒了！答对了！'}
        score={locale === 'ja' ? '+10 XP 獲得' : locale === 'en' ? '+10 XP Gained' : '+10 XP 经验值'}
        btnLabel={locale === 'ja' ? 'つぎへすすむ →' : locale === 'en' ? 'Next →' : '下一步 →'}
      />
      <Header
        locale={locale}
        setLocale={setLocale}
        userStatus={userStatus}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
      />

      <div className="pt-[calc(var(--header-height)+1rem)] flex justify-center w-full">
        <div className="max-w-7xl w-full flex flex-col lg:flex-row items-start gap-8 p-4 sm:p-6">

          {/* 左側: メインプレイヤーエリア */}
          <div className="flex-1 min-w-0">
            {!isOnline && (
              <div className="mb-4 rounded-3xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600">Offline</div>
                <div className="mt-1 text-sm font-bold text-emerald-900">
                  {locale === 'ja'
                    ? 'オフライン軽量モードです。問題は解けますが、コメント・いいね・保存は接続後に使えます。'
                    : locale === 'en'
                      ? 'You are in offline light mode. You can solve quizzes, but comments, likes, and saves need a connection.'
                      : '当前为离线轻量模式。你可以做题，但评论、点赞和收藏需要联网后使用。'}
                </div>
              </div>
            )}
            <div 
              ref={quizVisualRef}
              className="w-full aspect-video rounded-3xl overflow-hidden bg-transparent relative mb-4 group/visual"
            >
              {displayImageUrl ? (
                <QuizVisual
                  imageUrl={displayImageUrl}
                  alt={t.title}
                  priority={true}
                  plain={true}
                  containerClassName="h-full rounded-3xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                  No Image
                </div>
              )}





              {showAnswer && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 ${lastResult === 'correct' ? 'bg-green-900/40' : 'bg-red-900/90'}`}>
                  {lastResult === 'correct' ? (
                    <>
                      <div className="w-20 h-20 sm:w-32 sm:h-32 mb-4 sm:mb-6 animate-bounce filter drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] flex items-center justify-center">
                        <Image src="/icons/circle.svg" alt="" width={128} height={128} className="w-full h-full brightness-0 invert opacity-90" />
                      </div>
                      <h2 className="text-white font-black text-3xl sm:text-6xl mb-2 drop-shadow-lg">
                        {locale === 'ja' ? '正解！' : locale === 'en' ? 'Bingo!' : '答对了！'}
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 sm:w-24 sm:h-24 mb-4 sm:mb-6 text-white opacity-80 flex items-center justify-center">
                        <Image src="/icons/cross.svg" alt="" width={96} height={96} className="w-full h-full brightness-0 invert" />
                      </div>
                      <h2 className="text-white font-bold text-2xl sm:text-4xl mb-2">
                        {locale === 'ja' ? 'おしい！' : locale === 'en' ? 'Too bad!' : '可惜！'}
                      </h2>
                      <p className="text-red-200 text-base sm:text-lg font-bold mb-4 sm:mb-6">
                        {locale === 'ja' ? '正解は...' : locale === 'en' ? 'The answer is...' : '正确答案是...'}
                      </p>
                    </>
                  )}
                  <div className="text-white text-3xl sm:text-5xl font-black italic tracking-tight">
                    <LatexRenderer text={t.answer} />
                  </div>
                </div>
              )}
            </div>

            <h1 className="min-w-0 max-w-full text-2xl font-medium mb-2 leading-tight break-words [overflow-wrap:anywhere] lg:truncate safari-no-faux-bold" title={t.title}>
              <LatexRenderer text={t.title.replace(/\n/g, ' ')} className="block max-w-full break-words [overflow-wrap:anywhere] lg:truncate lg:!whitespace-nowrap" />
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-6 pb-6 border-b border-[var(--border)] min-w-0 max-w-full overflow-hidden">
              {quiz.channel ? (
                <Link href={`/channel/${quiz.channel.id}`} className="flex items-center gap-3 hover:bg-[var(--card)] p-2 rounded-xl transition-all border border-transparent hover:border-[var(--border)]">
                  <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-700 overflow-hidden relative border border-[var(--border)]">
                    {quiz.channel.avatarUrl && quiz.channel.avatarUrl !== "" ? (
                      <Image
                        src={quiz.channel.avatarUrl}
                        alt={quiz.channel.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 text-sm">
                        {quiz.channel.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-sm">{quiz.channel.name}</div>
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-2 min-w-0 max-w-full">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white shadow-sm" title="Official">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div className="font-bold text-sm leading-tight text-zinc-700 dark:text-zinc-300">
                    Cue Official
                  </div>
                </div>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 max-w-full">
                <button type="button" onClick={() => handleAction('like')} className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${isLiked ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-pink-500 hover:border-pink-500'}`}>
                  <Image src="/icons/heart.svg" alt="" width={16} height={16} className={`w-4 h-4 transition-colors ${isLiked ? 'brightness-0 invert' : 'opacity-60 grayscale'}`} />
                  {locale === 'ja' ? 'いいね' : locale === 'en' ? 'Like' : '点赞'}
                </button>
                <button type="button" onClick={() => handleAction('bookmark')} className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${isBookmarked ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-blue-500 hover:border-blue-500'}`}>
                  <Image src="/icons/star.svg" alt="" width={16} height={16} className={`w-4 h-4 transition-colors ${isBookmarked ? 'brightness-0 invert' : 'opacity-60 grayscale'}`} />
                  {locale === 'ja' ? '保存' : locale === 'en' ? 'Save' : '收藏'}
                </button>
              </div>
            </div>

            {/* 問題文と回答フォーム */}
            <div className="bg-[var(--card)] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-[var(--border)] mb-8">
              {isOnline && <AdSense slot="watch" />}
              <h3 className="font-medium text-lg sm:text-xl mb-6 leading-relaxed break-words [overflow-wrap:anywhere] safari-no-faux-bold">
                <LatexRenderer text={t.question} />
              </h3>

              {!showAnswer && (
                <div className="mb-6">
                  {!showHint ? (
                    <button type="button" onClick={() => setShowHint(true)} className="text-sm text-blue-500 font-semibold hover:underline mb-6 flex items-center gap-1.5 safari-no-faux-bold">
                      <Image src="/icons/hint.svg" alt="" width={16} height={16} className="w-4 h-4 opacity-80" style={{ filter: 'invert(52%) sepia(87%) saturate(3015%) hue-rotate(193deg) brightness(101%) contrast(105%)' }} />
                      {locale === 'ja' ? 'ヒントをみる' : locale === 'en' ? 'Show hint' : '看提示'}
                    </button>
                  ) : (
                    <div className="text-sm bg-blue-500/10 text-blue-500 p-5 rounded-2xl mb-6 font-bold border border-blue-500/20 break-words [overflow-wrap:anywhere]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Image src="/icons/hint.svg" alt="" width={16} height={16} className="w-4 h-4 opacity-80" style={{ filter: 'invert(52%) sepia(87%) saturate(3015%) hue-rotate(193deg) brightness(101%) contrast(105%)' }} />
                        <span className="uppercase text-[10px] tracking-widest font-semibold">Hint</span>
                      </div>
                      <LatexRenderer text={t.hint} />
                    </div>
                  )}

                  {t.type === 'CHOICE' && mergedOptions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" translate="no">
                      {mergedOptions.map((opt: string, i: number) => {
                        const isOptLatex = isLatex(opt);
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => handleAnswerSubmit(opt === t.answer)}
                            className={`bg-[var(--background)] border-2 border-[var(--border)] hover:border-amber-500 hover:bg-amber-500/5 font-semibold ${isOptLatex ? 'py-8 text-2xl' : 'py-4'} rounded-2xl transition-all active:scale-[0.98] text-center safari-no-faux-bold`}
                          >
                            <LatexRenderer text={opt} />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder={locale === 'ja' ? '答えを入力' : locale === 'en' ? 'Your answer' : '输入答案'}
                        className="flex-1 border-2 border-zinc-300 p-3 rounded-xl font-bold focus:outline-none focus:border-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAnswerSubmit(normalizeAnswer(textAnswer) === normalizeAnswer(t.answer));
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAnswerSubmit(normalizeAnswer(textAnswer) === normalizeAnswer(t.answer))}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 rounded-xl transition-colors"
                      >
                        {locale === 'ja' ? '回答する' : locale === 'en' ? 'Submit' : '回答'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {showAnswer && explanation && (
                <div className="mt-6 rounded-2xl border border-blue-200/70 bg-blue-50/70 dark:bg-blue-950/20 dark:border-blue-900/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Image src="/icons/explanation.svg" alt="" width={16} height={16} className="w-4 h-4 opacity-70 grayscale brightness-0 invert-0 dark:invert" style={{ filter: locale === 'ja' ? 'none' : 'none' }} />
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-blue-700 dark:text-blue-300 safari-no-faux-bold">
                        {locale === 'ja' ? '解説' : locale === 'en' ? 'Explanation' : '解析'}
                      </h4>
                    </div>
                    <div className="inline-flex rounded-full border border-blue-200 dark:border-blue-800 overflow-hidden bg-white/70 dark:bg-blue-950/30">
                      <button
                        type="button"
                        onClick={() => setExplanationMode('gentle')}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${explanationMode === 'gentle'
                            ? 'bg-blue-500 text-white'
                            : 'text-blue-700 dark:text-blue-200'
                          }`}
                      >
                        {locale === 'ja' ? 'やさしい版' : locale === 'en' ? 'Simple' : '简明版'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExplanationMode('full')}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${explanationMode === 'full'
                            ? 'bg-blue-500 text-white'
                            : 'text-blue-700 dark:text-blue-200'
                          }`}
                      >
                        {locale === 'ja' ? 'しっかり版' : locale === 'en' ? 'Detailed' : '详细版'}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm sm:text-base leading-relaxed text-[var(--foreground)] break-words [overflow-wrap:anywhere]">
                    <LatexRenderer text={displayedExplanation || explanation} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-amber-500/20">
                  {quiz.category}
                </span>
                <span className="bg-zinc-500/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-zinc-500/20">
                  {quiz.targetAge}{locale === 'ja' ? '歳' : locale === 'en' ? ' yrs' : '岁'}
                </span>
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 ml-1">
                  <Image src="/icons/review.svg" alt="" width={12} height={12} className="w-3 h-3 opacity-40 grayscale" />
                  {quiz.viewCount || 0}{locale === 'ja' ? ' 回視聴' : locale === 'en' ? ' views' : ' 次观看'}
                </span>
              </div>
            </div>

            {/* コメント欄 */}
            <div>
              <h2 className="text-xl font-semibold mb-6 safari-no-faux-bold">{comments.length} {locale === 'ja' ? '件のコメント' : locale === 'en' ? 'Comments' : '条评论'}</h2>

              {isLoggedIn ? (
                <form onSubmit={submitComment} className="flex gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex-shrink-0" />
                  <div className="flex-1">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={locale === 'ja' ? '質問や感想を書いてみよう...' : locale === 'en' ? 'Write a comment...' : '写点什么吧...'} className="w-full border-b-2 border-[var(--border)] p-2 focus:outline-none focus:border-amber-500 bg-transparent transition-colors" />
                    <div className="flex justify-end mt-3">
                      <button type="submit" disabled={isSubmitting || !newComment.trim() || !isOnline} className="bg-amber-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 hover:bg-amber-600 text-white font-semibold py-2.5 px-8 rounded-full text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 safari-no-faux-bold">
                        {locale === 'ja' ? 'コメントする' : locale === 'en' ? 'Post' : '发布'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-[var(--card)] p-6 rounded-2xl text-center text-sm font-semibold text-zinc-500 mb-10 border border-[var(--border)] safari-no-faux-bold">
                  {locale === 'ja' ? 'コメントするにはログインしてください' : locale === 'en' ? 'Log in to comment' : '登录后评论'}
                </div>
              )}

              <div className="flex flex-col gap-8">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black flex-shrink-0 text-sm shadow-md">
                      {c.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-black text-sm">{c.userName}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{c.createdAt.split('T')[0]}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--foreground)]/80 break-words [overflow-wrap:anywhere] [word-break:break-all]">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 関連動画エリア（レコメンド） */}
          <div className="lg:w-96 flex-shrink-0 self-start">
            <h3 className="font-semibold mb-6 flex items-center gap-2 safari-no-faux-bold">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full inline-block" />
              {locale === 'ja' ? '次のおすすめ' : locale === 'en' ? 'Up Next' : '接下来播放'}
            </h3>
            <div className="flex flex-col gap-5">
              {relatedQuizzes?.map((rel) => (
                <Link href={`/watch/${rel.id}`} key={rel.id} className="flex items-start gap-4 group cursor-pointer">
                  {(() => {
                    const relTranslation = rel.translations?.[locale] || rel.translations?.ja || null;
                    const relTitle = relTranslation?.title || rel.title;
                    const relImage = relTranslation?.imageUrl || rel.imageUrl || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop';

                    return (
                      <>
                        <div className="w-44 shrink-0 aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden relative border border-[var(--border)]">
                          <Image
                            src={relImage}
                            alt={relTitle}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-white/10">
                            {rel.targetAge}{locale === 'ja' ? '歳' : locale === 'en' ? ' yrs' : '岁'}
                          </div>
                        </div>
                        <div className="flex-1 py-0.5">
                          <h4 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-amber-500 transition-colors safari-no-faux-bold break-words [overflow-wrap:anywhere]">
                            {relTitle}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cue Official</p>
                            <span className="text-[10px] text-zinc-400/70 flex items-center gap-1">
                              • {rel.viewCount || 0}{locale === 'ja' ? ' 回' : locale === 'en' ? ' views' : ' 次'}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
