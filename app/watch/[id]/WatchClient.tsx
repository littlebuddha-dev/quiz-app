'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function WatchClient({ quiz, initialComments, initialBookmark, initialLike, initialCleared, isLoggedIn }: any) {
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
    <div className="min-h-screen bg-zinc-50 pt-16 flex justify-center">
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

          <h1 className="text-2xl font-bold text-zinc-900 mb-2">{quiz.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-zinc-200">
            {quiz.channel ? (
              <Link href={`/channel/${quiz.channel.id}`} className="flex items-center gap-3 hover:bg-zinc-100 p-2 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-full bg-zinc-300 overflow-hidden relative">
                  {quiz.channel.avatarUrl ? (
                    <Image src={quiz.channel.avatarUrl} alt={quiz.channel.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white bg-blue-500 text-sm">
                      {quiz.channel.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="font-bold text-sm text-zinc-800">{quiz.channel.name}</div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 text-white font-bold">公式</div>
              </div>
            )}
            
            <div className="ml-auto flex gap-2">
              <button onClick={() => handleAction('like')} className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors ${isLiked ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                ♥ いいね
              </button>
              <button onClick={() => handleAction('bookmark')} className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors ${isBookmarked ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                 ★ 保存
              </button>
            </div>
          </div>

          {/* 問題文と回答フォーム */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-8">
            <h3 className="font-bold text-lg text-zinc-700 mb-4">{quiz.question}</h3>
            
            {!showAnswer && (
              <div className="mb-6">
                {!showHint ? (
                  <button onClick={() => setShowHint(true)} className="text-sm text-blue-600 font-bold hover:underline mb-4">💡 ヒントを見る</button>
                ) : (
                  <div className="text-sm bg-blue-50 text-blue-800 p-4 rounded-xl mb-4 font-bold border border-blue-100">💡 {quiz.hint}</div>
                )}
                
                {quiz.type === 'CHOICE' && quiz.options ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quiz.options.map((opt: string, i: number) => (
                      <button key={i} onClick={() => handleAnswerSubmit(opt === quiz.answer)} className="bg-white border-2 border-zinc-300 hover:border-amber-500 hover:bg-amber-50 text-zinc-800 font-bold py-3 rounded-xl transition-all text-center">
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
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">{quiz.category}</span>
              <span className="bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-1 rounded">{quiz.targetAge}歳</span>
            </div>
          </div>

          {/* コメント欄 */}
          <div>
            <h2 className="text-xl font-bold text-zinc-800 mb-6">{comments.length} 件のコメント</h2>
            
            {isLoggedIn ? (
              <form onSubmit={submitComment} className="flex gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex-shrink-0" />
                <div className="flex-1">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="質問や感想を書いてみよう..." className="w-full border-b-2 border-zinc-300 p-2 focus:outline-none focus:border-zinc-800 bg-transparent" />
                  <div className="flex justify-end mt-2">
                    <button disabled={isSubmitting || !newComment.trim()} className="bg-blue-600 disabled:bg-zinc-300 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors">
                      コメント
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-zinc-100 p-4 rounded-xl text-center text-sm font-bold text-zinc-500 mb-8 border border-zinc-200">
                コメントするにはログインしてください
              </div>
            )}

            <div className="flex flex-col gap-6">
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm shadow-sm">
                    {c.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-zinc-900">{c.userName}</span>
                      <span className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-zinc-800 text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側: 関連動画エリア（今回はモックUIのみ） */}
        <div className="lg:w-96 flex-shrink-0 hidden lg:block">
          <h3 className="font-bold text-zinc-800 mb-4">次のおすすめ</h3>
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3 group cursor-pointer">
                <div className="w-40 aspect-video bg-zinc-200 rounded-lg overflow-hidden relative border border-zinc-200">
                  <Image src="https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=400&auto=format&fit=crop" alt="関連" fill className="object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    6歳
                  </div>
                </div>
                <div className="flex-1 py-1">
                  <h4 className="font-bold text-sm text-zinc-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">似ている論理クイズに挑戦してみよう</h4>
                  <p className="text-xs text-zinc-500 mt-1">公式チャンネル</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
