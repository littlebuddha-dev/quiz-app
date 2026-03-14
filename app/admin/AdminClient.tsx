'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Locale } from '../types';
import LatexRenderer from '../components/LatexRenderer';

export default function AdminClient({ initialQuizzes, categories, userStatus }: any) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('ja');
  const [activeTab, setActiveTab] = useState<Locale>('ja');
  const [mainTab, setMainTab] = useState<'ai' | 'manual' | 'categories'>('ai');
  const [categoriesList, setCategoriesList] = useState(categories);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', minAge: 0, maxAge: '' });
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGrade, setAiGrade] = useState('10');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(true);

  // AI生成用の詳細設定
  const [systemPrompt, setSystemPrompt] = useState(`あなたは「小学生向けの楽しい論理的思考」をテーマにした、SNSコンテンツクリエイターです。
ユーザーの要望に基づき、論理的思考力を養う「問題文」「ヒント」「答え」を作成し、以下のフォーマットのJSONで出力してください。
出力は必ず「日本語(ja)」「英語(en)」「中国語(zh)」の3言語すべて含めてください。

## 問題作成の制約事項
* **文字数制限**: 画像内に配置する各言語の「問題文」は「3行以内」かつ「極力短く」必ず収めること。ただし、画像とテキストで相違がない限りは、テキストの問題文の長さはその限りではない。`);
  const [correctionPrompt, setCorrectionPrompt] = useState('');

  // 検索・フィルター・ソート用の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const initialForm = {
    categoryId: categoriesList[0]?.id || '',
    targetAge: 6,
    imageUrl: '',
    translations: {
      ja: { title: '', question: '', hint: '', answer: '', type: 'TEXT' as 'TEXT' | 'CHOICE', options: '', imageUrl: '' },
      en: { title: '', question: '', hint: '', answer: '', type: 'TEXT' as 'TEXT' | 'CHOICE', options: '', imageUrl: '' },
      zh: { title: '', question: '', hint: '', answer: '', type: 'TEXT' as 'TEXT' | 'CHOICE', options: '', imageUrl: '' },
    }
  };

  const [formData, setFormData] = useState(initialForm);


  // クイズのフィルタリングとソート
  const filteredQuizzes = useMemo(() => {
    let result = quizzes.filter((q: any) => {
      const categoryMatch = selectedCategory === 'all' || q.categoryId === selectedCategory || q.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const titleMatch = (q.title || '').toLowerCase().includes(query);
      const idMatch = (q.id || '').toLowerCase().includes(query);
      return categoryMatch && (titleMatch || idMatch);
    });

    result.sort((a: any, b: any) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'ja');
      return 0;
    });

    return result;
  }, [quizzes, searchQuery, selectedCategory, sortBy]);


  const handleEdit = async (quiz: any) => {
    setEditingId(quiz.id);
    setMainTab('manual');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/quiz/${quiz.id}`);
      if (res.ok) {
        const fullQuiz = (await res.json()) as any;
        const newTranslations: any = { ...initialForm.translations };
        fullQuiz.translations.forEach((t: any) => {
          newTranslations[t.locale as Locale] = {
            title: t.title || '',
            question: t.question || '',
            hint: t.hint || '',
            answer: t.answer || '',
            type: t.type || 'TEXT',
            options: t.options ? (Array.isArray(t.options) ? t.options.join(', ') : t.options) : '',
            imageUrl: t.imageUrl || '',
          };
        });

        setFormData({
          categoryId: fullQuiz.categoryId,
          targetAge: fullQuiz.targetAge,
          imageUrl: fullQuiz.imageUrl || '',
          translations: newTranslations
        });
      } else {
        alert('クイズ詳細の取得に失敗しました');
        setEditingId(null);
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
      setEditingId(null);
    }
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialForm);
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetLocale?: Locale) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadKey = targetLocale || 'global';
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (targetLocale) {
          setFormData(prev => ({
            ...prev,
            translations: {
              ...prev.translations,
              [targetLocale]: { ...prev.translations[targetLocale], imageUrl: data.imageUrl }
            }
          }));
        } else {
          setFormData((prev) => ({ ...prev, imageUrl: data.imageUrl }));
        }
      } else {
        alert('画像のアップロードに失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setUploading(prev => ({ ...prev, [uploadKey]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ja = formData.translations.ja;
    if (!ja.title || !ja.question || !ja.answer) {
      alert('日本語のタイトル、問題文、正解は必須です');
      setActiveTab('ja');
      return;
    }
    const filteredTranslations: any = {};
    for (const [loc, data] of Object.entries(formData.translations)) {
      if (loc === 'ja' || (data.title || data.question || data.answer)) {
        filteredTranslations[loc] = {
          ...data,
          options: (data.type as string) === 'CHOICE' ? data.options.split(',').map((opt: string) => opt.trim()).filter(Boolean) : null,
        };
      }
    }
    const submitData = {
      id: editingId,
      categoryId: formData.categoryId,
      targetAge: formData.targetAge,
      imageUrl: formData.imageUrl,
      translations: filteredTranslations
    };
    try {
      const res = await fetch('/api/admin/quiz', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      if (res.ok) {
        alert(editingId ? '更新しました' : '作成しました');
        if (!editingId) handleCancelEdit();
        router.refresh();
      } else {
        const err = (await res.json()) as any;
        alert(`失敗しました: ${err.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error(error);
      alert('通信エラーが発生しました');
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
        body: JSON.stringify({
          topic: aiTopic,
          gradeLevel: aiGrade,
          systemPrompt,
          correctionPrompt
        })
      });
      if (res.ok) {
        alert('AIでクイズを生成しました！');
        setAiTopic('');
        setCorrectionPrompt('');
        router.refresh();
      } else {
        const errorData = (await res.json()) as any;
        alert(errorData.message || '生成に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: editingCatId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCatId, ...catFormData }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (editingCatId) {
          setCategoriesList(categoriesList.map((c: any) => c.id === editingCatId ? updated : c));
        } else {
          setCategoriesList([...categoriesList, updated]);
        }
        setCatFormData({ name: '', minAge: 0, maxAge: '' });
        setEditingCatId(null);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('このジャンルを削除しますか？関連するクイズに影響が出る可能性があります。')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategoriesList(categoriesList.filter((c: any) => c.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const currentTranslation = formData.translations[activeTab];

  return (
    <div className="pt-20 text-[var(--foreground)] min-h-screen">
      <Header locale={locale} setLocale={setLocale} userStatus={userStatus} hideSearch={true} />
      
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <h1 className="text-3xl font-black">管理者ダッシュボード</h1>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8 relative max-w-7xl mx-auto px-4 pb-10">
        {/* サイドバー: リスト */}
        <aside className="lg:w-80 w-full shrink-0">
          <div className="bg-[var(--card)] p-6 rounded-3xl shadow-xl shadow-black/5 border border-[var(--border)] lg:sticky top-24 lg:max-h-[calc(100vh-120px)] flex flex-col">
            <h2 className="text-lg font-black mb-4 flex items-center justify-between">
              <span>登録済みクイズ</span>
              <span className="text-xs bg-[var(--background)] px-2 py-1 rounded-full text-zinc-400 font-bold">{quizzes.length}</span>
            </h2>

            <div className="flex flex-col gap-3 mb-6">
              <input type="text" placeholder="検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold" />
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setSelectedCategory('all')} className={`text-[9px] font-black px-2 py-1 rounded-full border ${selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'text-zinc-400'}`}>すべて</button>
                {categoriesList.map((c: any) => (
                  <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`text-[9px] font-black px-2 py-1 rounded-full border ${selectedCategory === c.id ? 'bg-blue-500 text-white' : 'text-zinc-400'}`}>{c.name}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2">
              {filteredQuizzes.map((q: any) => (
                <div key={q.id} className={`p-3 rounded-xl border transition-all ${editingId === q.id ? 'border-blue-500 bg-blue-500/5' : 'border-[var(--border)] hover:bg-zinc-50'}`}>
                  <div className="font-bold text-[13px] truncate">
                    <LatexRenderer text={q.title} />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[8px] font-black bg-zinc-100 px-1.5 py-0.5 rounded">{q.targetAge}歳</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(q)} className="p-1 bg-blue-500 text-white rounded">✏️</button>
                      <button onClick={() => handleDelete(q.id)} className="p-1 bg-red-500 text-white rounded">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* メインエリア */}
        <main className="flex-1 min-w-0">
          <div className="flex gap-1 bg-[var(--card)] p-1 rounded-2xl border border-[var(--border)] self-start mb-8 overflow-x-auto no-scrollbar">
            <button onClick={() => setMainTab('ai')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'ai' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>🌟 AI生成</button>
            <button onClick={() => setMainTab('manual')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'manual' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>✍️ 手動作成</button>
            <button onClick={() => setMainTab('categories')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'categories' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>📁 ジャンル管理</button>
          </div>

          {mainTab === 'ai' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl shadow-xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6">AIクイズ生成</h2>
              <form onSubmit={handleAiGenerate} className="space-y-6">
                <div className="flex gap-4">
                  <input type="text" placeholder="トピック" value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 font-bold" />
                  <select value={aiGrade} onChange={e => setAiGrade(e.target.value)} className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4 font-bold">
                    <option value="6">小学生</option>
                    <option value="9">中学生</option>
                    <option value="12">高校生</option>
                    <option value="15">大学・一般</option>
                  </select>
                </div>
                <button disabled={loading} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {loading ? '生成中...' : 'AIで高度なクイズを生成する 🚀'}
                </button>
              </form>
            </div>
          )}

          {mainTab === 'categories' && (
             <div className="bg-[var(--card)] p-8 rounded-3xl shadow-xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6">ジャンル管理</h2>
              <form onSubmit={handleSaveCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-[var(--background)] p-6 rounded-2xl items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">ジャンル名</label>
                  <input type="text" required placeholder="ジャンル名" value={catFormData.name} onChange={e => setCatFormData({...catFormData, name: e.target.value})} className="w-full border p-3 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">最小年齢</label>
                  <input type="number" placeholder="最小年齢" value={catFormData.minAge} onChange={e => setCatFormData({...catFormData, minAge: parseInt(e.target.value)})} className="w-full border p-3 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">最大年齢</label>
                  <input type="number" placeholder="最大年齢 (任意)" value={catFormData.maxAge} onChange={e => setCatFormData({...catFormData, maxAge: e.target.value})} className="w-full border p-3 rounded-xl font-bold" />
                </div>
                <button type="submit" className="bg-amber-500 text-white rounded-xl py-3 font-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {editingCatId ? '更新' : '追加'}
                </button>
              </form>
              <table className="w-full">
                <thead><tr className="text-left border-b font-black"><th>ジャンル</th><th>対象年齢</th><th>操作</th></tr></thead>
                <tbody>
                  {categoriesList.map((c: any) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-4 font-bold">{c.name}</td>
                      <td>{c.minAge}歳 〜 {c.maxAge ? `${c.maxAge}歳` : 'なし'}</td>
                      <td className="space-x-2">
                        <button onClick={() => { setEditingCatId(c.id); setCatFormData({name: c.name, minAge: c.minAge, maxAge: c.maxAge || ''}); }}>✏️</button>
                        <button onClick={() => handleDeleteCategory(c.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mainTab === 'manual' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6">手動作成・編集</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">ジャンル</label>
                      <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                        {categoriesList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">適正年齢</label>
                      <input type="number" value={formData.targetAge} placeholder="適正年齢" onChange={e => setFormData({...formData, targetAge: Number(e.target.value)})} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]" />
                    </div>
                  </div>
                <div className="bg-[var(--background)] p-6 rounded-2xl border-2 border-dashed border-[var(--border)] mb-6">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">共通サムネイル画像</p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="relative w-32 aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-3">
                      <input type="text" placeholder="画像URL (任意)" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full border p-3 rounded-xl text-sm font-bold bg-white dark:bg-zinc-900" />
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e)} className="hidden" id="global-image-upload" />
                        <label htmlFor="global-image-upload" className={`inline-block px-6 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${uploading.global ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-800 text-white hover:bg-black'}`}>
                          {uploading.global ? 'アップロード中...' : 'ファイルを選択...'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {(['ja', 'en', 'zh'] as Locale[]).map(loc => (
                    <button key={loc} type="button" onClick={() => setActiveTab(loc)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${activeTab === loc ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>{loc.toUpperCase()}</button>
                  ))}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">タイトル</label>
                      <input type="text" placeholder="例: 三平方の定理の基本" value={currentTranslation.title} onChange={e => setFormData({...formData, translations: {...formData.translations, [activeTab]: {...currentTranslation, title: e.target.value}}})} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">クイズ形式</label>
                      <select value={currentTranslation.type} onChange={e => setFormData({...formData, translations: {...formData.translations, [activeTab]: {...currentTranslation, type: e.target.value as 'TEXT' | 'CHOICE'}}})} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                        <option value="TEXT">記述式</option>
                        <option value="CHOICE">選択式</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">問題文 (LaTeX可)</label>
                    <textarea placeholder="問題文を入力..." value={currentTranslation.question} onChange={e => setFormData({...formData, translations: {...formData.translations, [activeTab]: {...currentTranslation, question: e.target.value}}})} className="w-full border p-4 rounded-2xl font-bold min-h-[120px]" />
                  </div>

                  {currentTranslation.type === 'CHOICE' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">選択肢 (カンマ区切り)</label>
                      <input type="text" placeholder="例: 選択肢1, 選択肢2, 選択肢3" value={currentTranslation.options} onChange={e => setFormData({...formData, translations: {...formData.translations, [activeTab]: {...currentTranslation, options: e.target.value}}})} className="w-full border p-4 rounded-2xl font-bold bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 shadow-inner" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">正解</label>
                      <input type="text" placeholder="例: 答えを入力" value={currentTranslation.answer} onChange={e => setFormData({...formData, translations: {...formData.translations, [activeTab]: {...currentTranslation, answer: e.target.value}}})} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">ヒント</label>
                      <input type="text" placeholder="例: ヒントを入力" value={currentTranslation.hint} onChange={e => setFormData({...formData, translations: {...formData.translations, [activeTab]: {...currentTranslation, hint: e.target.value}}})} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                    {editingId ? 'クイズを更新する' : '新しく作成する'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="px-8 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black rounded-2xl hover:bg-zinc-200 transition-all">キャンセル</button>
                  )}
                </div>
              </form>

              {/* プレビューエリア */}
              <div className="mt-10 p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Live Preview (LaTeX)</h3>
                  <button onClick={() => setShowPreview(!showPreview)} className="text-xs font-bold text-blue-500">
                    {showPreview ? '非表示' : '表示'}
                  </button>
                </div>
                {showPreview && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase">Title</p>
                      <div className="font-bold">{currentTranslation.title || '---'}</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase">Question</p>
                      <LatexRenderer text={currentTranslation.question || '問題文を入力してください...'} />
                    </div>
                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase">Hint</p>
                      <LatexRenderer text={currentTranslation.hint || 'ヒントを入力してください...'} className="text-sm text-zinc-500" />
                    </div>
                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase">Answer</p>
                      <LatexRenderer text={currentTranslation.answer || '正解を入力してください...'} className="font-black text-amber-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
