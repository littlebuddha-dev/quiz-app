'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function WatchClient({ quiz, initialComments, initialBookmark, initialLike, initialCleared, isLoggedIn, relatedQuizzes }: any) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCleared, setIsCleared] = useState(initialCleared);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmark);
  const [isLiked, setIsLiked] = useState(initialLike);
  
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (action: 'bookmark' | 'like') => {
    if (!isLoggedIn) return alert('ログインが必要です');
    
    if (action === 'bookmark') Object.assign(isBookmarked, !isBookmarked), setIsBookmarked(!isBookmarked);
    if (action === 'like') Object.assign(isLiked, !isLiked), setIsLiked(!isLiked);

    await fetch('/api/user/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, quizId: quiz.id })
    });
  };

  const handleAnswerSubmit = async (isCorrect: boolean) => {
    setShowAnswer(true);
    if (!isCleared && isLoggedIn) {
      setIsCleared(true);
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
      const addedComment = await res.json();
      setComments([addedComment.comment, ...comments]);
      setNewComment('');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pt-16 flex justify-center text-[var(--foreground)] transition-colors">
      <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-8 p-6">
        
        {/* 左側: メインプレイヤーエリア */}
        <div className="flex-1">
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black relative mb-4">
            <Image src={quiz.imageUrl || 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b'} alt={quiz.title} fill className="object-cover opacity-80" />
            
            {showAnswer && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <h2 className="text-amber-400 font-bold text-3xl mb-4">正解は...</h2>
                <p className="text-white text-4xl font-bold mb-6">{quiz.answer}</p>
                {isCleared && <p className="text-green-400 text-xl font-bold bg-green-500/20 px-6 py-2 rounded-full">クリア達成！</p>}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-black mb-2 leading-tight">{quiz.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-[var(--border)]">
            {quiz.channel ? (
              <Link href={`/channel/${quiz.channel.id}`} className="flex items-center gap-3 hover:bg-[var(--card)] p-2 rounded-xl transition-all border border-transparent hover:border-[var(--border)]">
                <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-700 overflow-hidden relative border border-[var(--border)]">
                  {quiz.channel.avatarUrl ? (
                    <Image src={quiz.channel.avatarUrl} alt={quiz.channel.name} fill className="object-cover" />
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
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white font-bold">公式</div>
              </div>
            )}
            
            <div className="ml-auto flex gap-3">
              <button onClick={() => handleAction('like')} className={`px-5 py-2.5 rounded-full font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${isLiked ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-pink-500 hover:border-pink-500'}`}>
                ♥ いいね
              </button>
              <button onClick={() => handleAction('bookmark')} className={`px-5 py-2.5 rounded-full font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${isBookmarked ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-blue-500 hover:border-blue-500'}`}>
                 ★ 保存
              </button>
            </div>
          </div>

          {/* 問題文と回答フォーム */}
          <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-xl shadow-black/5 mb-8">
            <h3 className="font-black text-xl mb-6 leading-relaxed">{quiz.question}</h3>
            
            {!showAnswer && (
              <div className="mb-6">
                {!showHint ? (
                  <button onClick={() => setShowHint(true)} className="text-sm text-blue-500 font-black hover:underline mb-6 flex items-center gap-1">💡 ヒントをみる</button>
                ) : (
                  <div className="text-sm bg-blue-500/10 text-blue-500 p-5 rounded-2xl mb-6 font-bold border border-blue-500/20">💡 {quiz.hint}</div>
                )}
                
                {quiz.type === 'CHOICE' && quiz.options ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quiz.options.map((opt: string, i: number) => (
                      <button key={i} onClick={() => handleAnswerSubmit(opt === quiz.answer)} className="bg-[var(--background)] border-2 border-[var(--border)] hover:border-amber-500 hover:bg-amber-500/5 font-black py-4 rounded-2xl transition-all active:scale-[0.98] text-center shadow-sm">
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="答えを入力" className="flex-1 border-2 border-zinc-300 p-3 rounded-xl font-bold focus:outline-none focus:border-amber-500" />
                    <button onClick={() => handleAnswerSubmit(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 rounded-xl transition-colors">
                      回答する
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <span className="bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-amber-500/20">{quiz.category}</span>
              <span className="bg-zinc-500/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-zinc-500/20">{quiz.targetAge}歳</span>
            </div>
          </div>

          {/* コメント欄 */}
          <div>
            <h2 className="text-xl font-black mb-6">{comments.length} 件のコメント</h2>
            
            {isLoggedIn ? (
              <form onSubmit={submitComment} className="flex gap-4 mb-10">
                <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex-shrink-0" />
                <div className="flex-1">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="質問や感想を書いてみよう..." className="w-full border-b-2 border-[var(--border)] p-2 focus:outline-none focus:border-amber-500 bg-transparent transition-colors" />
                  <div className="flex justify-end mt-3">
                    <button disabled={isSubmitting || !newComment.trim()} className="bg-amber-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 hover:bg-amber-600 text-white font-black py-2.5 px-8 rounded-full text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95">
                      コメントする
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-[var(--card)] p-6 rounded-2xl text-center text-sm font-black text-zinc-500 mb-10 border border-[var(--border)] shadow-sm">
                コメントするにはログインしてください
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
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{new Date(c.createdAt).toLocaleDateString()}</span>
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
            次のおすすめ
          </h3>
          <div className="flex flex-col gap-5">
            {relatedQuizzes?.map((rel: any) => (
              <Link href={`/watch/${rel.id}`} key={rel.id} className="flex gap-4 group cursor-pointer">
                <div className="w-44 aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden relative border border-[var(--border)] shadow-sm">
                  <Image src={rel.imageUrl} alt={rel.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-white/10">
                    {rel.targetAge}歳
                  </div>
                </div>
                <div className="flex-1 py-0.5">
                  <h4 className="font-black text-sm line-clamp-2 leading-tight group-hover:text-amber-500 transition-colors">
                    {rel.title}
                  </h4>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">NanoQuizTube Official</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
