'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminClient({ initialQuizzes, categories }: any) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('8');
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-8">
        {/* AI自動生成セクション */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
          <h2 className="text-xl font-bold mb-4 text-indigo-900 flex items-center gap-2">
            <span>✨</span> AIでクイズを自動生成
          </h2>
          <form onSubmit={handleAiGenerate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">トピック（例: 宇宙、ペンギン、算数パズル）</label>
              <input 
                required 
                type="text" 
                placeholder="興味のあるテーマを入力..."
                value={aiTopic} 
                onChange={e => setAiTopic(e.target.value)} 
                className="w-full border-2 border-indigo-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">対象学年（年齢の目安）</label>
              <select 
                value={aiGrade} 
                onChange={e => setAiGrade(e.target.value)} 
                className="w-full border-2 border-indigo-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
              >
                <option value="7">小学1年生 (7歳)</option>
                <option value="8">小学2年生 (8歳)</option>
                <option value="9">小学3年生 (9歳)</option>
                <option value="10">小学4年生 (10歳)</option>
                <option value="11">小学5年生 (11歳)</option>
                <option value="12">小学6年生 (12歳)</option>
              </select>
            </div>
            <button 
              disabled={loading || !aiTopic.trim()} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
            >
              {loading ? 'AIが考え中...' : 'AIで問題と画像を生成する'}
            </button>
          </form>
          <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
            ※Gemini AIが問題文と画像を同時に生成し、データベースに保存します。生成には10〜20秒程度かかる場合があります。
          </p>
        </div>

        {/* 新規作成フォーム */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 h-fit">
          <h2 className="text-xl font-bold mb-4">手動でクイズ作成</h2>
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
