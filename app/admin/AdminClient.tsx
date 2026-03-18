'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Locale } from '../types';
import LatexRenderer from '../components/LatexRenderer';
import { AI_MODELS, DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';

export default function AdminClient({ initialQuizzes, categories, userStatus }: any) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('ja');
  const [activeTab, setActiveTab] = useState<Locale>('ja');
  const [mainTab, setMainTab] = useState<'ai' | 'manual' | 'categories' | 'usage' | 'tools'>('ai');
  const [categoriesList, setCategoriesList] = useState(categories);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', minAge: 0, maxAge: '', systemPrompt: '' });
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategoryId, setAiCategoryId] = useState(categories[0]?.id || '');
  const [aiTargetAge, setAiTargetAge] = useState(6);
  const [aiType, setAiType] = useState<'TEXT' | 'CHOICE'>('TEXT');
  const [aiImageUrl, setAiImageUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [usageData, setUsageData] = useState<any>(null);
  const [newBudget, setNewBudget] = useState<number>(10);
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, target?: Locale | 'ai') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadKey = target || 'global';
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
        if (target === 'ai') {
          setAiImageUrl(data.imageUrl);
        } else if (target) {
          setFormData(prev => ({
            ...prev,
            translations: {
              ...prev.translations,
              [target as Locale]: { ...prev.translations[target as Locale], imageUrl: data.imageUrl }
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
          categoryId: aiCategoryId || categoriesList[0]?.id,
          targetAge: aiTargetAge,
          quizType: aiType,
          imageUrl: aiImageUrl,
          systemPrompt,
          correctionPrompt,
          modelId: getModelById(selectedModel).generatorId
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
          alert('ジャンルを更新しました');
        } else {
          setCategoriesList([...categoriesList, updated]);
          alert('ジャンルを追加しました');
        }
        setCatFormData({ name: '', minAge: 0, maxAge: '', systemPrompt: '' });
        setEditingCatId(null);
        router.refresh();
      } else {
        const err = (await res.json()) as any;
        alert(`失敗しました: ${err.message || 'エラーが発生しました'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === 'その他') {
      alert('「その他」ジャンルは削除できません');
      return;
    }
    if (!confirm('このジャンルを削除しますか？紐づいているクイズは「その他」ジャンルに自動的に移行されます。')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategoriesList(categoriesList.filter((c: any) => c.id !== id));
        alert('ジャンルを削除しました（クイズは「その他」に移動されました）');
        router.refresh();
      } else {
        const err = (await res.json()) as any;
        alert(`削除に失敗しました: ${err.message || 'エラーが発生しました'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const [bulkQuantity, setBulkQuantity] = useState(3);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/auto-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: aiCategoryId || categoriesList[0]?.id,
          targetAge: aiTargetAge,
          quantity: bulkQuantity,
          quizType: aiType,
          modelId: selectedModel
        })
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        alert(`${data.count}個のクイズを自動生成しました！`);
        router.refresh();
      } else {
        const err = (await res.json()) as any;
        alert(err.message || '自動生成に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setBulkLoading(false);
  };

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/admin/usage');
      if (res.ok) {
        const data = (await res.json()) as any;
        setUsageData(data);
        setNewBudget(data.budget.limit);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  };

  useEffect(() => {
    if (mainTab === 'usage') {
      fetchUsage();
    }
  }, [mainTab]);

  const handleSaveBudget = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'API_MONTHLY_BUDGET', value: newBudget })
      });
      if (res.ok) {
        alert('予算制限を更新しました');
        fetchUsage();
      } else {
        alert('更新に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました');
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
                  <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`text-[9px] font-black px-2 py-1 rounded-full border ${selectedCategory === c.id ? 'bg-blue-500 text-white' : 'text-zinc-400'}`}>{c.name || '(名称未設定)'}</button>
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
            <button onClick={() => setMainTab('usage')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'usage' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>💳 資金管理</button>
            <button onClick={() => setMainTab('tools')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'tools' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>🔗 外部ツール</button>
          </div>

          {mainTab === 'ai' && (
            <div className="space-y-8">
              <div className="bg-[var(--card)] p-8 rounded-3xl shadow-xl border border-[var(--border)]">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-600 p-2 rounded-xl text-lg">✨</span>
                  個別AIクイズ生成
                </h2>
                <form onSubmit={handleAiGenerate} className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">生成エンジン</label>
                      <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full border p-4 rounded-2xl font-bold bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-500">
                        {AI_MODELS.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">ジャンル</label>
                      <select value={aiCategoryId} onChange={e => setAiCategoryId(e.target.value)} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                        {categoriesList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">適正年齢</label>
                      <input type="number" value={aiTargetAge} placeholder="適正年齢" onChange={e => setAiTargetAge(Number(e.target.value))} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">クイズ形式</label>
                      <select value={aiType} onChange={e => setAiType(e.target.value as 'TEXT' | 'CHOICE')} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                        <option value="TEXT">記述式</option>
                        <option value="CHOICE">選択式</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">トピック・テーマ</label>
                      <input type="text" placeholder="例: 宇宙の不思議" value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]" />
                    </div>
                  </div>

                  <div className="bg-[var(--background)] p-6 rounded-2xl border-2 border-dashed border-[var(--border)] mb-6">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">共通サムネイル画像 (任意)</p>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="relative w-32 aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
                        {aiImageUrl ? (
                          <img src={aiImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-zinc-400"><span>No Image</span><span className="text-[8px] text-center mt-1">(空欄の場合はAIが自動生成)</span></div>
                        )}
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <input type="text" placeholder="画像URL (空欄なら自動生成)" value={aiImageUrl} onChange={e => setAiImageUrl(e.target.value)} className="w-full border p-3 rounded-xl text-sm font-bold bg-white dark:bg-zinc-900" />
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'ai')} className="hidden" id="ai-image-upload" />
                          <label htmlFor="ai-image-upload" className={`inline-block px-6 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${uploading.ai ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-800 text-white hover:bg-black'}`}>
                            {uploading.ai ? 'アップロード中...' : 'ファイルを選択...'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <details className="mt-4 mb-6">
                    <summary className="cursor-pointer text-sm font-bold text-zinc-500 hover:text-zinc-700">システムプロンプト (高度な設定)</summary>
                    <div className="mt-4 space-y-4 p-4 border rounded-xl bg-[var(--background)]">
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest">要件定義</label>
                      <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} className="w-full border p-4 rounded-xl font-bold min-h-[100px] text-xs" />
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest">追加指示</label>
                      <textarea value={correctionPrompt} onChange={e => setCorrectionPrompt(e.target.value)} className="w-full border p-4 rounded-xl font-bold min-h-[60px] text-xs" />
                    </div>
                  </details>

                  <button disabled={loading} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                    {loading ? '生成中...' : 'AIでクイズを生成する 🚀'}
                  </button>
                </form>
              </div>

              {/* 🚀 フルオート自動生成セクション */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-xl text-white">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span className="bg-white/20 p-2 rounded-xl text-lg">🤖</span>
                  全自動バルク生成
                  <span className="ml-auto text-[10px] bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest font-bold">New</span>
                </h2>
                <p className="text-xs font-bold text-indigo-100 mb-6">
                  AIが既存のクイズを分析し、新しいトピックを自動で提案して複数のクイズを一括生成します。
                </p>
                <form onSubmit={handleBulkGenerate} className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1 pr-1">ハイブリッド生成モード</label>
                      <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-[11px] outline-none focus:bg-white/20 transition-all">
                        {AI_MODELS.map((m: any) => <option key={m.id} value={m.id} className="text-zinc-800">{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">ジャンル</label>
                      <select value={aiCategoryId} onChange={e => setAiCategoryId(e.target.value)} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white/20 transition-all">
                        {categoriesList.map((c: any) => <option key={c.id} value={c.id} className="text-zinc-800">{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">対象年齢</label>
                      <input type="number" value={aiTargetAge} onChange={e => setAiTargetAge(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white/20 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">生成数</label>
                      <select value={bulkQuantity} onChange={e => setBulkQuantity(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white/20 transition-all">
                        {[1, 3, 5, 10].map(n => <option key={n} value={n} className="text-zinc-800">{n}個</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">形式</label>
                      <select value={aiType} onChange={e => setAiType(e.target.value as 'TEXT' | 'CHOICE')} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white/20 transition-all">
                        <option value="TEXT" className="text-zinc-800">記述式</option>
                        <option value="CHOICE" className="text-zinc-800">選択式</option>
                      </select>
                    </div>
                  </div>
                  <button disabled={bulkLoading || loading} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-xl hover:bg-orange-50 active:scale-95 transition-all text-sm">
                    {bulkLoading ? '🤖 自動トピック考案 & 生成中...' : 'バルク生成を開始する ⚡️'}
                  </button>
                </form>
              </div>
            </div>
          )}


          {mainTab === 'categories' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl shadow-xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6">ジャンル管理</h2>
              <form onSubmit={handleSaveCategory} className="space-y-4 mb-8 bg-[var(--background)] p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">ジャンル名</label>
                    <input type="text" required placeholder="ジャンル名" value={catFormData.name} onChange={e => setCatFormData({ ...catFormData, name: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">最小年齢</label>
                    <input type="number" placeholder="最小年齢" value={catFormData.minAge} onChange={e => setCatFormData({ ...catFormData, minAge: parseInt(e.target.value) })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">最大年齢</label>
                    <input type="number" placeholder="最大年齢 (任意)" value={catFormData.maxAge} onChange={e => setCatFormData({ ...catFormData, maxAge: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">個別システムプロンプト (高度な設定)</label>
                  <textarea placeholder="このジャンルに特化したAIへの指示を入力してください..." value={catFormData.systemPrompt || ''} onChange={e => setCatFormData({ ...catFormData, systemPrompt: e.target.value })} className="w-full border p-4 rounded-xl font-bold min-h-[100px] text-xs bg-white dark:bg-zinc-900" />
                </div>
                <button type="submit" className="w-full bg-amber-500 text-white rounded-xl py-3 font-black shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-95 transition-all">
                  {editingCatId ? 'ジャンルを更新' : '新しいジャンルを追加'}
                </button>
              </form>
              <table className="w-full">
                <thead><tr className="text-left border-b font-black text-xs text-zinc-400 uppercase tracking-wider"><th className="pb-4">ジャンル</th><th className="pb-4">対象年齢</th><th className="pb-4">プロンプト</th><th className="pb-4">操作</th></tr></thead>
                <tbody>
                  {categoriesList.map((c: any) => (
                    <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-4 font-bold">{c.name || <span className="text-zinc-300 italic">(名称未設定)</span>}</td>
                      <td className="text-sm font-bold">{c.minAge}歳 〜 {c.maxAge ? `${c.maxAge}歳` : 'なし'}</td>
                      <td>
                        {c.systemPrompt ? (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">設定済み</span>
                        ) : (
                          <span className="text-[10px] bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full font-black">未設定</span>
                        )}
                      </td>
                      <td className="space-x-2">
                        <button onClick={() => { setEditingCatId(c.id); setCatFormData({ name: c.name, minAge: c.minAge, maxAge: c.maxAge || '', systemPrompt: c.systemPrompt || '' }); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">✏️</button>
                        <button onClick={() => handleDeleteCategory(c.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors">🗑️</button>
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
                    <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                      {categoriesList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">適正年齢</label>
                    <input type="number" value={formData.targetAge} placeholder="適正年齢" onChange={e => setFormData({ ...formData, targetAge: Number(e.target.value) })} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]" />
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
                      <input type="text" placeholder="画像URL (任意)" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full border p-3 rounded-xl text-sm font-bold bg-white dark:bg-zinc-900" />
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
                      <input type="text" placeholder="例: 三平方の定理の基本" value={currentTranslation.title} onChange={e => setFormData({ ...formData, translations: { ...formData.translations, [activeTab]: { ...currentTranslation, title: e.target.value } } })} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">クイズ形式</label>
                      <select value={currentTranslation.type} onChange={e => setFormData({ ...formData, translations: { ...formData.translations, [activeTab]: { ...currentTranslation, type: e.target.value as 'TEXT' | 'CHOICE' } } })} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                        <option value="TEXT">記述式</option>
                        <option value="CHOICE">選択式</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">問題文 (LaTeX可)</label>
                    <textarea placeholder="問題文を入力..." value={currentTranslation.question} onChange={e => setFormData({ ...formData, translations: { ...formData.translations, [activeTab]: { ...currentTranslation, question: e.target.value } } })} className="w-full border p-4 rounded-2xl font-bold min-h-[120px]" />
                  </div>

                  {currentTranslation.type === 'CHOICE' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">選択肢 (カンマ区切り)</label>
                      <input type="text" placeholder="例: 選択肢1, 選択肢2, 選択肢3" value={currentTranslation.options} onChange={e => setFormData({ ...formData, translations: { ...formData.translations, [activeTab]: { ...currentTranslation, options: e.target.value } } })} className="w-full border p-4 rounded-2xl font-bold bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 shadow-inner" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">正解</label>
                      <input type="text" placeholder="例: 答えを入力" value={currentTranslation.answer} onChange={e => setFormData({ ...formData, translations: { ...formData.translations, [activeTab]: { ...currentTranslation, answer: e.target.value } } })} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">ヒント</label>
                      <input type="text" placeholder="例: ヒントを入力" value={currentTranslation.hint} onChange={e => setFormData({ ...formData, translations: { ...formData.translations, [activeTab]: { ...currentTranslation, hint: e.target.value } } })} className="w-full border p-4 rounded-2xl font-bold" />
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
          {mainTab === 'usage' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-3xl shadow-2xl text-white border border-white/10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                      <span className="bg-white/10 p-2 rounded-xl text-xl">💳</span>
                      API 資金・利用上限管理
                    </h2>
                    <p className="text-zinc-400 text-sm font-bold">今月の利用状況とコストの見積もりを表示します。</p>
                  </div>
                  <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">リセット日</p>
                    <p className="text-sm font-black">毎月1日</p>
                  </div>
                </div>

                {usageData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">現在の利用額 (推定)</p>
                      <p className="text-3xl font-black text-amber-500">${usageData.budget.currentUsage.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">月間予算制限</p>
                      <p className="text-3xl font-black text-white">${usageData.budget.limit.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">予算消化率</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-black text-white">{Math.min(100, Math.round((usageData.budget.currentUsage / usageData.budget.limit) * 100))}%</p>
                        <p className="text-zinc-500 text-xs mb-1.5 font-bold">/ 100%</p>
                      </div>
                    </div>
                  </div>
                )}

                {usageData && (
                  <div className="mb-10">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">予算使用状況プログレス</p>
                      <p className="text-xs font-bold text-zinc-500">${usageData.budget.currentUsage.toFixed(2)} / ${usageData.budget.limit.toFixed(2)}</p>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${usageData.budget.currentUsage > usageData.budget.limit ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                        style={{ width: `${Math.min(100, (usageData.budget.currentUsage / usageData.budget.limit) * 100)}%` }}
                      ></div>
                    </div>
                    {usageData.budget.currentUsage >= usageData.budget.limit && (
                      <p className="mt-3 text-red-400 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                        ⚠️ 予算制限に達しました。新しいクイズ生成は一時停止されています。
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-zinc-800/50 p-6 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    予算設定の変更
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black">$</span>
                      <input 
                        type="number" 
                        value={newBudget} 
                        onChange={e => setNewBudget(parseFloat(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl py-3 pl-8 pr-4 font-black outline-none focus:border-amber-500 transition-all"
                        placeholder="10.00"
                      />
                    </div>
                    <button 
                      onClick={handleSaveBudget}
                      disabled={loading}
                      className="px-8 bg-amber-500 text-black font-black rounded-xl hover:bg-amber-400 active:scale-95 transition-all text-sm"
                    >
                      {loading ? '更新中...' : '予算を更新'}
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] text-zinc-500 font-bold italic">※ 予算を超過すると、APIを利用した自動生成機能が一時的に無効化されます。</p>
                </div>
              </div>

              <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-xl">
                <h2 className="text-lg font-black mb-6 flex items-center gap-2">
                  <span className="bg-zinc-100 p-2 rounded-xl text-zinc-600">📊</span>
                  モデル別利用内訳 (今月)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-[var(--border)] font-black text-[10px] text-zinc-400 uppercase tracking-widest">
                        <th className="pb-4">モデル名</th>
                        <th className="pb-4">リクエスト数</th>
                        <th className="pb-4">消費トークン</th>
                        <th className="pb-4 text-right">推定コスト (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageData?.usageByModel?.map((m: any) => (
                        <tr key={m.modelId} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-4">
                            <span className="font-black text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">{m.modelId}</span>
                          </td>
                          <td className="py-4 text-sm font-bold">{m.requests}回</td>
                          <td className="py-4 text-sm font-bold text-zinc-500">{(m.tokens / 1000).toFixed(1)}k tokens</td>
                          <td className="py-4 text-sm font-black text-right text-amber-600">${m.cost.toFixed(4)}</td>
                        </tr>
                      ))}
                      {(!usageData?.usageByModel || usageData.usageByModel.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-zinc-400 font-bold italic">データがありません</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {mainTab === 'tools' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a href="http://localhost:5555" target="_blank" rel="noopener noreferrer" className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">💎</span>
                    <div>
                      <h3 className="text-lg font-black">Prisma Studio</h3>
                      <p className="text-xs font-bold text-zinc-500">Database Management GUI</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    データベース（SQLite）の中身を直接ブラウザで確認・編集できます。
                    <br />
                    <span className="text-[10px] text-zinc-400 italic">※ ローカルで `npx prisma studio` が実行中である必要があります</span>
                  </p>
                  <div className="flex items-center text-xs font-black text-emerald-600 gap-1">
                    リンクを開く <span className="text-lg">→</span>
                  </div>
                </a>

                <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">🔑</span>
                    <div>
                      <h3 className="text-lg font-black">Clerk Dashboard</h3>
                      <p className="text-xs font-bold text-zinc-500">User Authentication & Roles</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    ユーザーの管理、認証設定、権限（ADMIN/CHILD）の変更などを行います。
                  </p>
                  <div className="flex items-center text-xs font-black text-indigo-600 gap-1">
                    ダッシュボードへ <span className="text-lg">→</span>
                  </div>
                </a>

                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-amber-100 text-amber-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">✨</span>
                    <div>
                      <h3 className="text-lg font-black">Google AI Studio</h3>
                      <p className="text-xs font-bold text-zinc-500">Gemini API & Prompts</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    Gemini APIキーの発行、プロンプトのテスト、クォータの確認ができます。
                  </p>
                  <div className="flex items-center text-xs font-black text-amber-600 gap-1">
                    API管理を開く <span className="text-lg">→</span>
                  </div>
                </a>

                <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-orange-100 text-orange-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">☁️</span>
                    <div>
                      <h3 className="text-lg font-black">Cloudflare Dashboard</h3>
                      <p className="text-xs font-bold text-zinc-500">Deployments & D1 Database</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    デプロイのステータス確認、D1データベース（本番環境）の操作などを行います。
                  </p>
                  <div className="flex items-center text-xs font-black text-orange-600 gap-1">
                    コンソールへ <span className="text-lg">→</span>
                  </div>
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
