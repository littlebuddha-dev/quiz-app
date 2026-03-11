'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminClient({ initialQuizzes, categories }: any) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submitData = {
      ...formData,
      options: formData.type === 'CHOICE' ? formData.options.split(',').map((opt) => opt.trim()) : null,
    };

    const res = await fetch('/api/admin/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData)
    });

    if (res.ok) {
      alert('作成しました');
      router.refresh();
    } else {
      alert('作成に失敗しました');
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* 新規作成フォーム */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 h-fit">
        <h2 className="text-xl font-bold mb-4">新規クイズ作成</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">タイトル</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold mb-1">カテゴリ</label>
              <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full border rounded p-2">
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold mb-1">対象年齢</label>
              <input required type="number" value={formData.targetAge} onChange={e => setFormData({...formData, targetAge: Number(e.target.value)})} className="w-full border rounded p-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">画像URL (Unsplash等)</label>
            <input required type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">問題文 (Markdown/長文可)</label>
            <textarea required rows={4} value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">ヒント</label>
            <input type="text" value={formData.hint} onChange={e => setFormData({...formData, hint: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold mb-1">タイプ</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border rounded p-2">
                <option value="TEXT">テキスト入力</option>
                <option value="CHOICE">選択肢</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold mb-1">正解 (TEXT/CHOICE共通)</label>
              <input required type="text" value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full border rounded p-2" />
            </div>
          </div>
          {formData.type === 'CHOICE' && (
            <div>
              <label className="block text-sm font-bold mb-1">選択肢 (カンマ区切り)</label>
              <input type="text" placeholder="リンゴ, バナナ, みかん" value={formData.options} onChange={e => setFormData({...formData, options: e.target.value})} className="w-full border rounded p-2" />
            </div>
          )}
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-2 transition-colors">
            {loading ? '作成中...' : 'クイズを追加'}
          </button>
        </form>
      </div>

      {/* 一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
        <h2 className="text-xl font-bold mb-4">登録済みクイズ ({quizzes.length})</h2>
        <div className="flex flex-col gap-3">
          {quizzes.map((q: any) => (
            <div key={q.id} className="flex items-center justify-between border-b pb-3 border-zinc-100">
              <div>
                <p className="font-bold">{q.title}</p>
                <div className="text-xs text-zinc-500 flex gap-2 mt-1">
                  <span>{q.type}</span>
                  <span>{q.targetAge}歳</span>
                  <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(q.id)}
                disabled={loading}
                className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold transition-colors">
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
