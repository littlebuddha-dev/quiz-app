'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LatexRenderer from '../../components/LatexRenderer';

// ... (other imports)
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Quiz, Locale } from '../../types';
import CorrectEffect from '../../components/CorrectEffect';
import AdSense from '../../components/AdSense';
import { usePreferredLocale } from '../../hooks/usePreferredLocale';

interface WatchClientProps {
  quiz: Quiz;
  initialComments: any[];
  initialBookmark: boolean;
  initialLike: boolean;
  initialCleared: boolean;
  isLoggedIn: boolean;
  relatedQuizzes: any[];
  userStatus?: { xp: number; level: number; role: string };
  initialLocale?: Locale;
}

export default function WatchClient({
  quiz,
  initialComments,
  initialBookmark,
  initialLike,
  initialCleared,
  isLoggedIn,
  relatedQuizzes,
  userStatus,
  initialLocale = 'ja'
}: WatchClientProps) {
  const { locale, setLocale } = usePreferredLocale();
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCorrectEffect, setShowCorrectEffect] = useState(false);
  const [isCleared, setIsCleared] = useState(initialCleared);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmark);
  const [isLiked, setIsLiked] = useState(initialLike);

  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);

  // 現在の言語の翻訳を取得。なければ日本語をフォールバックに。
  const t = quiz.translations[locale] || quiz.translations['ja'];
  const explanation = t.explanation?.trim();

  // 画像のフォールバックロジック
  const displayImageUrl = (t.imageUrl && t.imageUrl !== "")
    ? t.imageUrl
    : (quiz.imageUrl && quiz.imageUrl !== "")
      ? quiz.imageUrl
      : 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop';

  const isDataUri = displayImageUrl.startsWith('data:');

  const normalizeAnswer = (value: string) =>
    value.trim().replace(/\s+/g, '').toLowerCase();

  const handleAction = async (action: 'bookmark' | 'like') => {
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

    // ログインしていれば履歴を保存
    if (isCorrect) {
      setShowCorrectEffect(true);
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
    if (!newComment.trim() || !isLoggedIn) return;

    setIsSubmitting(true);
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id, content: newComment })
    });

    if (res.ok) {
      const addedComment = (await res.json()) as any;
      setComments([addedComment.comment, ...comments]);
      setNewComment('');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors" suppressHydrationWarning>
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
        hideSearch={true}
      />

      <div className="pt-20 flex justify-center">
        <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-8 p-4 sm:p-6">

          {/* 左側: メインプレイヤーエリア */}
          <div className="flex-1">
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black relative mb-4">
              {displayImageUrl ? (
                <Image
                  src={displayImageUrl}
                  alt={t.title}
                  fill
                  className="object-cover"
                  unoptimized={isDataUri}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                  No Image
                </div>
              )}

              {/* タイトル（見出し）を画像の上にオーバーレイ表示 */}
              <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <h2 className="text-white text-xl sm:text-2xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight max-w-[90%]">
                  <LatexRenderer text={t.title} />
                </h2>
              </div>

              {showAnswer && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 ${lastResult === 'correct' ? 'bg-green-900/40' : 'bg-red-900/90'}`}>
                  {lastResult === 'correct' ? (
                    <>
                      <div className="text-9xl mb-4 animate-bounce filter drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">⭕</div>
                      <h2 className="text-white font-black text-6xl mb-2 drop-shadow-lg">
                        {locale === 'ja' ? '正解！' : locale === 'en' ? 'Bingo!' : '答对了！'}
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="text-7xl mb-4 text-white opacity-80">❌</div>
                      <h2 className="text-white font-bold text-4xl mb-2">
                        {locale === 'ja' ? 'おしい！' : locale === 'en' ? 'Too bad!' : '可惜！'}
                      </h2>
                      <p className="text-red-200 text-lg font-bold mb-6">
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

            <h1 className="text-2xl font-black mb-2 leading-tight">
              <LatexRenderer text={t.title} />
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-[var(--border)]">
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
                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">OFFICIAL</div>
                </div>
              )}

              <div className="ml-auto flex gap-2 sm:gap-3">
                <button onClick={() => handleAction('like')} className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${isLiked ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-pink-500 hover:border-pink-500'}`}>
                  ♥ {locale === 'ja' ? 'いいね' : locale === 'en' ? 'Like' : '点赞'}
                </button>
                <button onClick={() => handleAction('bookmark')} className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${isBookmarked ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-blue-500 hover:border-blue-500'}`}>
                  ★ {locale === 'ja' ? '保存' : locale === 'en' ? 'Save' : '收藏'}
                </button>
              </div>
            </div>

            {/* 問題文と回答フォーム */}
            <div className="bg-[var(--card)] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-[var(--border)] shadow-xl shadow-black/5 mb-8">
              <AdSense slot="watch" />
              <h3 className="font-black text-lg sm:text-xl mb-6 leading-relaxed">
                <LatexRenderer text={t.question} />
              </h3>

              {!showAnswer && (
                <div className="mb-6">
                  {!showHint ? (
                    <button onClick={() => setShowHint(true)} className="text-sm text-blue-500 font-black hover:underline mb-6 flex items-center gap-1">
                      💡 {locale === 'ja' ? 'ヒントをみる' : locale === 'en' ? 'Show hint' : '看提示'}
                    </button>
                  ) : (
                    <div className="text-sm bg-blue-500/10 text-blue-500 p-5 rounded-2xl mb-6 font-bold border border-blue-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span>💡</span>
                        <span className="uppercase text-[10px] tracking-widest font-black">Hint</span>
                      </div>
                      <LatexRenderer text={t.hint} />
                    </div>
                  )}

                  {t.type === 'CHOICE' && t.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {t.options.map((opt: string, i: number) => (
                        <button key={i} onClick={() => handleAnswerSubmit(opt === t.answer)} className="bg-[var(--background)] border-2 border-[var(--border)] hover:border-amber-500 hover:bg-amber-500/5 font-black py-4 rounded-2xl transition-all active:scale-[0.98] text-center shadow-sm">
                          {opt}
                        </button>
                      ))}
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📘</span>
                    <h4 className="font-black text-sm uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      {locale === 'ja' ? '解説' : locale === 'en' ? 'Explanation' : '解析'}
                    </h4>
                  </div>
                  <div className="text-sm sm:text-base leading-relaxed text-[var(--foreground)]">
                    <LatexRenderer text={explanation} />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <span className="bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-amber-500/20">{quiz.category}</span>
                <span className="bg-zinc-500/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-zinc-500/20">
                  {quiz.targetAge}{locale === 'ja' ? '歳' : locale === 'en' ? ' yrs' : '岁'}
                </span>
              </div>
            </div>

            {/* コメント欄 */}
            <div>
              <h2 className="text-xl font-black mb-6">{comments.length} {locale === 'ja' ? '件のコメント' : locale === 'en' ? 'Comments' : '条评论'}</h2>

              {isLoggedIn ? (
                <form onSubmit={submitComment} className="flex gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex-shrink-0" />
                  <div className="flex-1">
                    <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={locale === 'ja' ? '質問や感想を書いてみよう...' : locale === 'en' ? 'Write a comment...' : '写点什么吧...'} className="w-full border-b-2 border-[var(--border)] p-2 focus:outline-none focus:border-amber-500 bg-transparent transition-colors" />
                    <div className="flex justify-end mt-3">
                      <button disabled={isSubmitting || !newComment.trim()} className="bg-amber-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 hover:bg-amber-600 text-white font-black py-2.5 px-8 rounded-full text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95">
                        {locale === 'ja' ? 'コメントする' : locale === 'en' ? 'Post' : '发布'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-[var(--card)] p-6 rounded-2xl text-center text-sm font-black text-zinc-500 mb-10 border border-[var(--border)] shadow-sm">
                  {locale === 'ja' ? 'コメントするにはログインしてください' : locale === 'en' ? 'Log in to comment' : '登录后评论'}
                </div>
              )}

              <div className="flex flex-col gap-8">
                {comments.map((c: any) => (
                  <div key={c.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black flex-shrink-0 text-sm shadow-md">
                      {c.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-black text-sm">{c.userName}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{c.createdAt.split('T')[0]}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--foreground)]/80">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 関連動画エリア（レコメンド） */}
          <div className="lg:w-96 flex-shrink-0">
            <h3 className="font-black mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full inline-block" />
              {locale === 'ja' ? '次のおすすめ' : locale === 'en' ? 'Up Next' : '接下来播放'}
            </h3>
            <div className="flex flex-col gap-5">
              {relatedQuizzes?.map((rel: any) => (
                <Link href={`/watch/${rel.id}`} key={rel.id} className="flex gap-4 group cursor-pointer">
                  {(() => {
                    const relTranslation = rel.translations?.[locale] || rel.translations?.ja || null;
                    const relTitle = relTranslation?.title || rel.title;
                    const relImage = relTranslation?.imageUrl || rel.imageUrl || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop';

                    return (
                      <>
                  <div className="w-44 aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden relative border border-[var(--border)] shadow-sm">
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
                    <h4 className="font-black text-sm line-clamp-2 leading-tight group-hover:text-amber-500 transition-colors">
                      {relTitle}
                    </h4>
                    <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">Cue Official</p>
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
