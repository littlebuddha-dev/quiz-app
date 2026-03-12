'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { Locale } from '../types';

export default function AdminClient({ initialQuizzes, categories, userStatus }: any) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<Locale>('ja');
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('8');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    categoryId: categories[0]?.id || '',
    targetAge: 6,
    imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop',
    question: '',
    hint: '',
    answer: '',
    type: 'TEXT',
    options: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleEdit = (quiz: any) => {
    setEditingId(quiz.id);
    setFormData({
      title: quiz.title,
      categoryId: quiz.categoryId || categories[0]?.id,
      targetAge: quiz.targetAge,
      imageUrl: quiz.imageUrl,
      question: quiz.question,
      hint: quiz.hint || '',
      answer: quiz.answer,
      type: quiz.type,
      options: quiz.options ? quiz.options.join(', ') : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      title: '',
      categoryId: categories[0]?.id || '',
      targetAge: 6,
      imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=800&auto=format&fit=crop',
      question: '',
      hint: '',
      answer: '',
      type: 'TEXT',
      options: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    
    setLoading(true);
    const res = await fetch('/api/admin/quiz', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: id })
    });

    if (res.ok) {
      setQuizzes(quizzes.filter((q: any) => q.id !== id));
      router.refresh();
    } else {
      alert('削除に失敗しました');
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        alert('画像のアップロードに失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submitData = {
      ...formData,
      id: editingId,
      options: formData.type === 'CHOICE' ? formData.options.split(',').map((opt) => opt.trim()) : null,
    };

    const res = await fetch('/api/admin/quiz', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData)
    });

    if (res.ok) {
      alert(editingId ? '更新しました' : '作成しました');
      handleCancelEdit();
      router.refresh();
    } else {
      alert(editingId ? '更新に失敗しました' : '作成に失敗しました');
    }
    setLoading(false);
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, gradeLevel: aiGrade, locale: 'ja' })
      });

      if (res.ok) {
        alert('AIでクイズを生成しました！');
        setAiTopic('');
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(errorData.message || '生成に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  return (
    <div className="pt-20 text-[var(--foreground)]">
      <Header 
        locale={locale} 
        setLocale={setLocale} 
        userStatus={userStatus} 
        hideSearch={true} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="flex flex-col gap-8">
        {/* AI自動生成セクション */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 rounded-3xl shadow-xl shadow-amber-500/5 border border-amber-500/20">
          <h2 className="text-xl font-black mb-6 flex items-center gap-3">
            <span className="text-2xl">✨</span> AIでクイズを生成
          </h2>
          <form onSubmit={handleAiGenerate} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">トピック</label>
              <input 
                required 
                type="text" 
                placeholder="例: 深海の不思議、恐竜の進化..."
                value={aiTopic} 
                onChange={e => setAiTopic(e.target.value)} 
                className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-amber-500 transition-all font-bold" 
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">対象年齢の目安</label>
              <select 
                value={aiGrade} 
                onChange={e => setAiGrade(e.target.value)} 
                className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-amber-500 transition-all font-bold"
              >
                <option value="7">7歳相当</option>
                <option value="8">8歳相当</option>
                <option value="9">9歳相当</option>
                <option value="10">10歳相当</option>
                <option value="11">11歳相当</option>
                <option value="12">12歳相当</option>
              </select>
            </div>
            <button 
              disabled={loading || !aiTopic.trim()} 
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              {loading ? 'AIが生成中...' : 'AIで問題と画像を生成する'}
            </button>
          </form>
          <p className="text-[10px] text-zinc-500 mt-6 leading-relaxed font-bold">
            ※Gemini AIが問題文と画像を同時に生成します。少し時間がかかる場合があります。
          </p>
        </div>

        {/* 手動作成・編集フォーム */}
        <div className="bg-[var(--card)] p-8 rounded-3xl shadow-xl shadow-black/5 border border-[var(--border)] h-fit">
          <h2 className="text-xl font-black mb-6">{editingId ? 'クイズを編集' : '手動でクイズ作成'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">タイトル</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">カテゴリ</label>
              <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold">
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">対象年齢</label>
              <input required type="number" value={formData.targetAge} onChange={e => setFormData({...formData, targetAge: Number(e.target.value)})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">画像</label>
            <div className="flex flex-col gap-4">
              {formData.imageUrl && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[var(--border)] bg-black/5">
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleUpload} 
                  className="hidden" 
                  id="image-upload" 
                />
                <label 
                  htmlFor="image-upload" 
                  className={`flex-1 cursor-pointer bg-[var(--background)] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[var(--foreground)] font-bold py-4 rounded-2xl text-center transition-all border-2 border-dashed ${uploading ? 'border-amber-500 opacity-50' : 'border-[var(--border)] hover:border-blue-500'}`}
                >
                  {uploading ? 'アップロード中...' : '📸 ローカル画像を選択'}
                </label>
                <div className="flex-[1.5]">
                  <input 
                    required 
                    type="text" 
                    placeholder="または画像URLを入力"
                    value={formData.imageUrl} 
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                    className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" 
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">問題文</label>
            <textarea required rows={4} value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">ヒント</label>
            <input type="text" value={formData.hint} onChange={e => setFormData({...formData, hint: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">タイプ</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold">
                <option value="TEXT">記述式</option>
                <option value="CHOICE">選択式</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">正解</label>
              <input required type="text" value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" />
            </div>
          </div>
          {formData.type === 'CHOICE' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">選択肢 (カンマ区切り)</label>
              <input type="text" placeholder="A, B, C..." value={formData.options} onChange={e => setFormData({...formData, options: e.target.value})} className="w-full border border-[var(--border)] rounded-2xl p-4 bg-[var(--background)] focus:outline-none focus:border-blue-500 transition-all font-bold" />
            </div>
          )}
          <div className="flex gap-3">
            {editingId && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 font-black py-4 rounded-2xl transition-all font-bold">
                中止
              </button>
            )}
            <button disabled={loading} className="flex-[2] bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
              {loading ? '処理中...' : (editingId ? '更新する' : '新規追加')}
            </button>
          </div>
        </form>
        </div>
      </div>

      {/* 一覧 */}
      <div className="bg-[var(--card)] p-8 rounded-3xl shadow-xl shadow-black/5 border border-[var(--border)]">
        <h2 className="text-xl font-black mb-6 flex items-center justify-between">
          <span>登録済みクイズ</span>
          <span className="text-sm bg-[var(--background)] px-3 py-1 rounded-full text-zinc-400">{quizzes.length} 件</span>
        </h2>
        <div className="flex flex-col gap-4">
          {quizzes.map((q: any) => (
            <div key={q.id} className="flex items-center justify-between border-b border-[var(--border)] pb-4 hover:translate-x-1 transition-transform">
              <div className="flex-1">
                <p className="font-black text-sm">{q.title}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-500/10 text-zinc-500 px-2 py-0.5 rounded border border-zinc-500/10">{q.type}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/10">{q.targetAge}歳</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(q)}
                  disabled={loading}
                  className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all">
                  編集
                </button>
                <button 
                  onClick={() => handleDelete(q.id)}
                  disabled={loading}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
}
