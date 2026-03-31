/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Locale } from '../types';
import LatexRenderer from '../components/LatexRenderer';
import { AI_MODELS, DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { getDefaultEducationalGuidelines, getEducationalGuidelinesValidation, normalizeEducationalGuidelines } from '@/lib/ai-prompts';
import { usePreferredLocale } from '../hooks/usePreferredLocale';
import { restoreBackupAction } from './backup-actions';

const SUPPORTED_LOCALES: Locale[] = ['ja', 'en', 'zh'];

export type AdminClientProps = {
  initialQuizzes: any;
  categories: any;
  userStatus?: { xp: number; level: number; role: string };
  initialComments?: any[]; // コメント管理用
};

export default function AdminClient({ initialQuizzes, categories, userStatus, initialComments = [] }: AdminClientProps) {
  const { locale, setLocale } = usePreferredLocale();
  const [activeTab, setActiveTab] = useState<Locale>('ja');
  const [mainTab, setMainTab] = useState<'ai' | 'manual' | 'categories' | 'usage' | 'system-tools' | 'tools' | 'backup' | 'comments' | 'education'>('ai');
  const [categoriesList, setCategoriesList] = useState(categories);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({ nameJa: '', nameEn: '', nameZh: '', minAge: 0, maxAge: '', systemPrompt: '', icon: '' });
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
  const [comments, setComments] = useState(initialComments);
  const [importTarget, setImportTarget] = useState<'quizzes' | 'translations'>('quizzes');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [eduData, setEduData] = useState<any>(null);
  const [eduGroup, setEduGroup] = useState<'小学校' | '中学校' | '高等学校'>('小学校');

  const reloadAdminPage = () => {
    window.location.reload();
  };

  // サーバーサイドからのデータ更新を反映
  useEffect(() => {
    setQuizzes(initialQuizzes);
  }, [initialQuizzes]);

  // ジャンルリストの更新
  useEffect(() => {
    setCategoriesList(categories);
  }, [categories]);
  const [showPreview, setShowPreview] = useState(true);

  // AI生成用の詳細設定
  const [systemPrompt, setSystemPrompt] = useState(`あなたは「小学生向けの楽しい論理的思考」をテーマにした、SNSコンテンツクリエイターです。
ユーザーの要望に基づき、論理的思考力を養う「画像用見出し」「詳細な問題文」「ヒント」「答え」「解説」を作成し、以下のフォーマットのJSONで出力してください。
出力は必ず「日本語(ja)」「英語(en)」「中国語(zh)」の3言語すべて含めてください。

## 各項目の役割
* **type**: クイズ形式です。'TEXT' (記述式) または 'CHOICE' (選択式) を指定してください。**重要**: リクエストが記述式であっても、答えが複雑な数式や10文字以上の長い文字列になる場合は、回答しやすさを優先して自動的に 'CHOICE' を選び、選択肢を作成してください。
* **title (画像用見出し)**: 画像の上に掲載する「見出し」です。**必ず3行以内**で、読みやすくインパクトのあるキャッチコピー風にまとめてください。
* **question (詳細な問題文)**: 画面下部に表示される詳細な「問題文」です。こちらは制限なく、背景や詳細な条件を含む長文を作成可能です。
* **options (選択肢)**: 選択式(CHOICE)の場合のみ、正解1つと誤答3つを含む、合計4つの文字列の配列(例: ["りんご", "みかん", "バナナ", "ぶどう"])を作成してください。
* **answer (解答)**: 選択式(CHOICE)の場合は、optionsの中の1つと完全一致する文字列を返してください。`);
  const [correctionPrompt, setCorrectionPrompt] = useState('');

  // 検索・フィルター・ソート用の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const initialForm = {
    categoryId: categoriesList[0]?.id || '',
    targetAge: 6,
    imageUrl: '',
    translations: {
      ja: { title: '', question: '', hint: '', answer: '', explanation: '', type: 'TEXT' as 'TEXT' | 'CHOICE', options: '', imageUrl: '', visualMode: 'image_only' },
      en: { title: '', question: '', hint: '', answer: '', explanation: '', type: 'TEXT' as 'TEXT' | 'CHOICE', options: '', imageUrl: '', visualMode: 'image_only' },
      zh: { title: '', question: '', hint: '', answer: '', explanation: '', type: 'TEXT' as 'TEXT' | 'CHOICE', options: '', imageUrl: '', visualMode: 'image_only' },
    }
  };

  const [formData, setFormData] = useState(initialForm);

  const formatAdminTimestamp = (value: string | number | Date) =>
    new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));


  // クイズのフィルタリングとソート
  const filteredQuizzes = useMemo(() => {
    const result = quizzes.filter((q: any) => {
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
        const translationKeys = Object.keys(fullQuiz.translations);
        translationKeys.forEach((locale: string) => {
          const t = fullQuiz.translations[locale];
          const parsedOptions = (() => {
            if (!t.options) return '';
            if (Array.isArray(t.options)) return t.options.join(', ');
            if (typeof t.options === 'string') {
              try {
                const parsed = JSON.parse(t.options);
                if (Array.isArray(parsed)) return parsed.join(', ');
                if (typeof parsed === 'string') {
                  try {
                    const nested = JSON.parse(parsed);
                    return Array.isArray(nested) ? nested.join(', ') : parsed;
                  } catch {
                    return parsed;
                  }
                }
                return t.options;
              } catch {
                return t.options;
              }
            }
            return '';
          })();

          newTranslations[locale as Locale] = {
            title: t.title || '',
            question: t.question || '',
            hint: t.hint || '',
            answer: t.answer || '',
            explanation: t.explanation || '',
            type: t.type || 'TEXT',
            options: parsedOptions,
            imageUrl: t.imageUrl || '',
            visualMode: t.visualMode || 'image_only',
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
    const res = await fetchWithRetry('/api/admin/quiz', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: id })
    });
    if (res.ok) {
      setQuizzes(quizzes.filter((q: any) => q.id !== id));
      fetchQuizzes();
    } else {
      alert('削除に失敗しました');
    }
    setLoading(false);
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('このコメントを削除しますか？')) return;
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/admin/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setComments(comments.filter((c: any) => c.id !== id));
        alert('コメントを削除しました');
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const handleExportBackup = async (type: 'db' | 'users' | 'images') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/backup?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = type === 'images' ? 'zip' : 'json';
        a.download = `quiz_backup_${type}_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('エクスポートに失敗しました');
      }
    } catch (error: any) {
      console.error(error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const handleDirectDbDownload = () => {
    // 認証済みのセッションで直接ブラウザからDL
    window.open('/api/admin/backup?format=file', '_blank');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isArchiveFile = /\.(zip|tgz|tar\.gz)$/i.test(file.name);

    if (!confirm('既存のデータ（クイズ、ジャンル等）がすべて削除され、バックアップの内容で上書きされます。本当によろしいですか？')) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      if (isArchiveFile) {
        const res = await fetch('/api/admin/backup/restore-images', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        const result = (await res.json()) as { success?: boolean; message?: string; error?: string };
        if (!res.ok || !result.success) {
          setRestoreError(`復元に失敗しました:\n\n${result.error || `Status ${res.status}`}`);
          return;
        }

        alert(result.message || '画像バックアップの復元が完了しました。ページをリロードします。');
        window.location.reload();
        return;
      } else {
        const formData = new FormData();
        const rawText = await file.text();
        const normalizedText = rawText.replace(/^\uFEFF/, '').trim();

        if (!normalizedText) {
          throw new Error('EMPTY_BACKUP_FILE');
        }

        if (normalizedText.startsWith('<!DOCTYPE') || normalizedText.startsWith('<html')) {
          throw new Error('HTML_BACKUP_FILE');
        }
        
        // JSONのバリデーションチェックのみ行う
        JSON.parse(normalizedText);
        // 巨大なデータを単一フィールドの文字列として送ると不安定になるため、Blob (ファイル) として添付
        const jsonBlob = new Blob([normalizedText], { type: 'application/json' });
        formData.append('json', jsonBlob);

        const result = await restoreBackupAction(formData);

        if (result && result.success) {
          alert(result.message || '復元が完了しました。ページをリロードします。');
          window.location.reload();
          return;
        }

        setRestoreError(`復元に失敗しました:\n\n${(result && 'error' in result ? result.error : undefined) || '不明なエラー'}`);
      }
    } catch (error: any) {
      console.error(error);
      if (error?.message === 'EMPTY_BACKUP_FILE') {
        alert('バックアップファイルが空です。');
      } else if (error?.message === 'HTML_BACKUP_FILE') {
        alert('JSONではなくHTMLファイルが選択されています。バックアップのダウンロードに失敗した可能性があります。');
      } else if (error instanceof SyntaxError || error.message?.includes('JSON')) {
        setRestoreError('バックアップの読み込みに失敗しました（JSON形式が不完全です）。\n\nファイルサイズが非常に大きい場合、通信の途中でデータが途切れた可能性があります。\n大容量データの移行には「SQLiteファイル直接コピー」を推奨します。\n\n詳細:\n' + error.message);
      } else {
        setRestoreError(`エラーが発生しました:\n${error.stack || error.message || '不明なエラー'}`);
      }
    } finally {
      e.target.value = '';
      setLoading(false);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 800; // Max width/height
        if (width > height) {
          if (width > max) {
            height = (max / width) * height;
            width = max;
          }
        } else {
          if (height > max) {
            width = (max / height) * width;
            height = max;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', 0.75); // quality 0.75
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, target?: Locale | 'ai') => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    const uploadKey = target || 'global';
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // クライアントサイドで圧縮
      const compressedBlob = await compressImage(rawFile);
      const file = new File([compressedBlob], rawFile.name, { type: 'image/jpeg' });

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

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
          // 共通サムネイルをアップロードした場合は、各言語の個別画像指定（AI生成等でセットされたもの）をクリアし、すべて共通画像が表示されるようにする。
          setFormData((prev) => ({
            ...prev,
            imageUrl: data.imageUrl,
            translations: {
              ja: { ...prev.translations.ja, imageUrl: '' },
              en: { ...prev.translations.en, imageUrl: '' },
              zh: { ...prev.translations.zh, imageUrl: '' }
            }
          }));
        }
      } else {
        alert('画像のアップロードに失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }

    // 次回も同じファイルが選択できるようにクリア
    e.target.value = '';
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
    const normalizedTranslations: any = {};
    for (const loc of SUPPORTED_LOCALES) {
      const data = formData.translations[loc];
      const optionsValue = typeof data.options === 'string' ? data.options : '';
      normalizedTranslations[loc] = {
        title: data.title || '',
        question: data.question || '',
        hint: data.hint || '',
        answer: data.answer || '',
        explanation: data.explanation || '',
        type: data.type || 'TEXT',
        imageUrl: data.imageUrl || '',
        visualMode: 'image_only',
        options: (data.type as string) === 'CHOICE'
          ? optionsValue.split(',').map((opt: string) => opt.trim()).filter(Boolean)
          : null,
      };
    }
    const submitData = {
      id: editingId,
      categoryId: formData.categoryId,
      targetAge: formData.targetAge,
      imageUrl: formData.imageUrl,
      translations: normalizedTranslations
    };
    try {
      const res = await fetchWithRetry('/api/admin/quiz', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      if (res.ok) {
        alert(editingId ? '更新しました' : '作成しました');
        if (!editingId) handleCancelEdit();
        fetchQuizzes();
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
    // API側で空トピックの自動生成に対応したため、フロントでのガードを削除
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/quiz-generator', {
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
          modelId: getModelById(selectedModel).generatorId,
          locale,
          deferImageGeneration: true,
        })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        alert(`サーバーから不正なレスポンス（HTMLなど）が返されました。 Status: ${res.status}\n${text.slice(0, 50)}...`);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = (await res.json()) as any;

        // クイズ本体（テキスト）が作成されたら、まず即座にリストを更新する
        fetchQuizzes();
        setAiTopic('');
        setCorrectionPrompt('');

        if (data?.id) {
          const imageGenerated = await triggerDeferredImageGeneration(data.id, locale);
          if (!imageGenerated) {
            alert('クイズ本文は作成できましたが、画像生成がまだ完了していないか失敗しました。ログを確認してください。');
          } else {
            alert('AIクイズと画像の生成が完了しました！');
          }
        } else {
          alert('AIでクイズを生成しました。');
        }

        // 画像生成後にもう一度リストを更新して最新の画像を表示
        fetchQuizzes();
      } else {
        const errorData = (await res.json()) as any;
        const detail = errorData.details ? ` (${errorData.details})` : '';
        alert(errorData.message || `生成に失敗しました。(Status: ${res.status}${detail})`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`エラーが発生しました：\n${error.message || ''}`);
    }
    setLoading(false);
  };

  const handleClearCache = async () => {
    if (!confirm('Next.jsのキャッシュをクリアします。データベースや登録画像は保持されます。よろしいですか？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cache/clear', { method: 'POST' });
      if (res.ok) {
        alert('キャッシュをクリアしました！');
      } else {
        const err = (await res.json()) as any;
        alert('エラーが発生しました: ' + (err.error || '不明なエラー'));
      }
    } catch (error) {
      console.error(error);
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const handleAiTranslate = async () => {
    const ja = formData.translations.ja;
    if (!ja.title || !ja.question) {
      alert('日本語のタイトルと問題文を入力してください');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/quiz/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ja: {
            ...ja,
            options: ja.type === 'CHOICE' ? ja.options : null
          },
          targetAge: formData.targetAge,
          categoryId: formData.categoryId
        })
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        setFormData(prev => ({
          ...prev,
          translations: {
            ...prev.translations,
            en: {
              ...prev.translations.en,
              ...data.en,
              options: Array.isArray(data.en?.options) ? data.en.options.join(', ') : (data.en?.options || '')
            },
            zh: {
              ...prev.translations.zh,
              ...data.zh,
              options: Array.isArray(data.zh?.options) ? data.zh.options.join(', ') : (data.zh?.options || '')
            }
          }
        }));
        alert('AI翻訳が完了し、英語と中国語のタブに反映しました！');
      } else {
        const err = (await res.json()) as any;
        alert('翻訳に失敗しました: ' + (err.message || '不明なエラー'));
      }
    } catch (error) {
      console.error(error);
      alert('通信エラーが発生しました');
    }
    setLoading(false);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/admin/categories', {
        method: editingCatId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCatId, ...catFormData }),
      });
      if (res.ok) {
        const updated = (await res.json()) as any;
        if (editingCatId) {
          setCategoriesList(categoriesList.map((c: any) => c.id === editingCatId ? updated : c));
          alert('ジャンルを更新しました');
        } else {
          setCategoriesList([...categoriesList, updated]);
          alert('ジャンルを追加しました');
        }
        setCatFormData({ nameJa: '', nameEn: '', nameZh: '', minAge: 0, maxAge: '', systemPrompt: '', icon: '' });
        setEditingCatId(null);
        fetchCategories();
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
      const res = await fetchWithRetry(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategoriesList(categoriesList.filter((c: any) => c.id !== id));
        alert('ジャンルを削除しました（クイズは「その他」に移動されました）');
        fetchCategories();
        fetchQuizzes(); // クイズのカテゴリが変わるため
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

  const handleMoveCategory = async (id: string, direction: 'up' | 'down') => {
    const index = categoriesList.findIndex((c: any) => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categoriesList.length - 1) return;

    const newCategories = [...categoriesList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // 入れ替え
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];

    // sortOrderをインデックスに基づいて再割り当て
    const updates = newCategories.map((c, i) => ({ id: c.id, sortOrder: i }));

    // 楽観的更新
    setCategoriesList(newCategories.map((c, i) => ({ ...c, sortOrder: i })));

    try {
      const res = await fetchWithRetry('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        alert('並び替えの保存に失敗しました');
        // 失敗した場合は元に戻すため、再取得して整合性を取り直す
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    }
  };

  const ICONS = [
    { id: 'math.svg', name: '算数 (Math)' },
    { id: 'language.svg', name: '国語 (Language)' },
    { id: 'science.svg', name: '理科 (Science)' },
    { id: 'social.svg', name: '社会 (Social)' },
    { id: 'logic.svg', name: '論理 (Logic)' },
    { id: 'coding.svg', name: 'プログラミング (Coding)' },
    { id: 'other.svg', name: 'その他 (Other)' },
  ];

  const [bulkQuantity, setBulkQuantity] = useState(3);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [autoBalance, setAutoBalance] = useState(false);

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkLoading(true);
    try {
      const res = await fetchWithRetry('/api/admin/auto-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: aiCategoryId || categoriesList[0]?.id,
          targetAge: aiTargetAge,
          quantity: bulkQuantity,
          quizType: aiType,
          modelId: selectedModel,
          autoBalance,
        })
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        alert(`${data.count}個のクイズを自動生成しました！`);
        fetchQuizzes();
      } else {
        const err = (await res.json()) as any;
        const detail = err.details ? ` (${err.details})` : '';
        alert(err.message || `自動生成に失敗しました。(Status: ${res.status}${detail})`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`エラーが発生しました：\n${error.message || ''}`);
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
      const res = await fetchWithRetry('/api/admin/settings', {
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

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 1): Promise<Response> => {
    const res = await fetch(url, options);
    if (res.status === 403 && retries > 0) {
      console.warn(`403 encountered. Retrying ${url}...`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, options, retries - 1);
    }
    return res;
  };

  const triggerDeferredImageGeneration = async (quizId: string, targetLocale: Locale, retries = 2): Promise<boolean> => {
    try {
      const imageRes = await fetchWithRetry('/api/admin/quiz/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          locale: 'all',
          force: true,
        }),
      });

      if (!imageRes.ok) {
        const errText = await imageRes.text();
        throw new Error(`Status ${imageRes.status}: ${errText}`);
      }

      const imageData = (await imageRes.json()) as {
        imageUrl?: string;
        imageUrls?: Partial<Record<Locale, string>>;
      };
      const localizedImageUrl = imageData.imageUrls?.[targetLocale] || imageData.imageUrl;
      if (localizedImageUrl) {
        setAiImageUrl(localizedImageUrl);
      }
      fetchQuizzes();
      return true;
    } catch (error) {
      console.warn('Deferred image generation failed:', error);
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return triggerDeferredImageGeneration(quizId, targetLocale, retries - 1);
      }
      return false;
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/admin/quiz?view=summary');
      if (res.ok) {
        const data = (await res.json()) as any;
        setQuizzes(data);
      }
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch('/api/admin/comments');
      if (res.ok) {
        const data = (await res.json()) as any;
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const fetchEduData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings?key=educational_guidelines');
      if (res.ok) {
        const data = await res.json();
        if (data && (data as any).value) {
          setEduData(normalizeEducationalGuidelines(JSON.parse((data as any).value)));
        } else {
          setEduData(getDefaultEducationalGuidelines());
        }
      } else {
        setEduData(getDefaultEducationalGuidelines());
      }
    } catch (err) {
      console.error(err);
      setEduData(getDefaultEducationalGuidelines());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (mainTab === 'education' && !eduData) {
      fetchEduData();
    }
  }, [mainTab, eduData]);

  const handleSaveEduData = async () => {
    if (!eduData) return;
    setLoading(true);
    try {
      const normalizedEduData = normalizeEducationalGuidelines(eduData);
      setEduData(normalizedEduData);
      const res = await fetchWithRetry('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'educational_guidelines', value: JSON.stringify(normalizedEduData) })
      });
      if (res.ok) {
        alert('教育内容設定を更新しました');
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
  const eduValidation = useMemo(() => (eduData ? getEducationalGuidelinesValidation(eduData) : []), [eduData]);
  const activeEduValidation = eduValidation.find((item: any) => item.group === eduGroup);

  return (
    <div className="pt-20 text-[var(--foreground)] min-h-screen">
      <Header locale={locale} setLocale={setLocale} userStatus={userStatus} hideSearch={true} />

      <div className="max-w-7xl mx-auto px-4 mb-8">
        <h1 className="text-3xl font-black">管理者ダッシュボード</h1>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8 relative max-w-7xl mx-auto px-4 pb-10">
        {/* サイドバー: リスト */}
        <aside className="lg:w-80 w-full shrink-0">
          <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] lg:sticky top-24 lg:max-h-[calc(100vh-120px)] flex flex-col">
            <h2 className="text-lg font-black mb-4 flex items-center justify-between">
              <span>登録済みクイズ</span>
              <span className="text-xs bg-[var(--background)] px-2 py-1 rounded-full text-zinc-400 font-bold">{quizzes.length}</span>
            </h2>

            <div className="flex flex-col gap-3 mb-6">
              <input type="text" placeholder="検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold" />
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setSelectedCategory('all')} className={`text-[9px] font-black px-2 py-1 rounded-full border ${selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'text-zinc-400'}`}>すべて</button>
                {categoriesList.map((c: any) => (
                  <button type="button" key={c.id} onClick={() => setSelectedCategory(c.id)} className={`text-[9px] font-black px-2 py-1 rounded-full border ${selectedCategory === c.id ? 'bg-blue-500 text-white' : 'text-zinc-400'}`}>{c.nameJa || c.name || '(名称未設定)'}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2">
              {filteredQuizzes.map((q: any) => (
                <div key={q.id} className={`p-3 rounded-xl border transition-all ${editingId === q.id ? 'border-blue-500 bg-blue-500/5' : 'border-[var(--border)] hover:bg-zinc-50'}`}>
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 items-start">
                    <div className="flex flex-col items-start gap-2">
                      <div className="w-[72px] aspect-video rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-[var(--border)] flex-shrink-0">
                        {(q.translations?.[locale]?.imageUrl || q.translations?.ja?.imageUrl || q.imageUrl) ? (
                          <img src={q.translations?.[locale]?.imageUrl || q.translations?.ja?.imageUrl || q.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[6px] text-zinc-300">NO IMG</div>
                        )}
                      </div>
                      <span className="text-[8px] font-black bg-zinc-100 px-1.5 py-0.5 rounded">{q.targetAge}歳</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleEdit(q)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"><img src="/icons/edit.svg" alt="" className="w-4 h-4 opacity-70 grayscale" /></button>
                        <button type="button" onClick={() => handleDelete(q.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"><img src="/icons/delete.svg" alt="" className="w-4 h-4 opacity-70 grayscale" /></button>
                      </div>
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="font-bold text-[13px] leading-snug break-words">
                        <LatexRenderer text={q.title} />
                      </div>
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
            <button type="button" onClick={() => setMainTab('ai')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'ai' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>🌟 AI生成</button>
            <button type="button" onClick={() => setMainTab('manual')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'manual' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>✍️ 手動作成</button>
            <button type="button" onClick={() => setMainTab('categories')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'categories' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>📁 ジャンル管理</button>
            <button type="button" onClick={() => setMainTab('education')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'education' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>📚 教育内容</button>
            <button type="button" onClick={() => setMainTab('comments')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'comments' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>💬 コメント管理</button>
            <button type="button" onClick={() => setMainTab('usage')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'usage' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>💳 資金管理</button>
            <button type="button" onClick={() => setMainTab('system-tools')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'system-tools' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>🛠️ ツール</button>
            <button type="button" onClick={() => setMainTab('tools')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'tools' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>🔗 外部ツール</button>
            <button type="button" onClick={() => setMainTab('backup')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap ${mainTab === 'backup' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}>💾 バックアップ</button>
          </div>

          {mainTab === 'ai' && (
            <div className="space-y-8">
              <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
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
                        {categoriesList.map((c: any) => <option key={c.id} value={c.id}>{c.nameJa || c.name}</option>)}
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
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">画像生成</label>
                      <div className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)] text-sm text-zinc-600">
                        日本語版を生成後、その画像から英語版・中国語版を派生生成
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
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
                        <button
                          type="button"
                          onClick={() => {
                            const title = aiTopic || '未設定';
                            const question = '未作成（AIが自動生成します）';
                            const options = aiType === 'CHOICE' ? '未作成（AIが自動生成します）' : 'なし (記述式)';
                            const answer = '未作成（AIが自動生成します）';
                            const hintText = '未作成（AIが自動生成します）';
                            const explText = '未作成（AIが自動生成します）';

                            const prompt = `以下のテーマについて、教育的で視覚的に魅力的な、非常に高画質でディティールの豊富なイラストを生成してください。
タイトル: ${title}
問題文: ${question}
選択肢・記述式: ${options}
正解: ${answer}
ヒント: ${hintText}
解説: ${explText}

## 1. 作成プロセス
1. **思考フェーズ**: 指定された条件で、読解力と論理的思考が必要な「問題文」と「正解・解説」を内部で決定します。
2. **画像生成フェーズ**: 決定した問題文を配置した挿絵画像を生成します。
3. **出力フェーズ**: 生成された画像の下に、決定しておいた「テキスト情報」を出力します。

## 2. 画像生成の制約事項
* **アスペクト比**: 8k解像度（横型 16:9）。
* **デザイン**: 低年齢向けは子供がワクワクする「絵本や児童書の挿絵風」イラスト。高学年から高校生は上質な科学教材や教育図解のような詳細なイラストまたはフォトリアルな写真。ディティールは詳細に描くこと。 nanobanana2スタイル、高品位、極めて詳細なディティール、傑作、色鮮やかで学習意欲を高める魅力的な構図。
* **言語**: 画像内のテキストは、指定がない限り「日本語」で作成してください。
* **文字の配置**: 画像内に問題文を配置すること。文字は可愛らしく、読みやすくレイアウトしてください。
* **文字数制限**: 画像に重ねる文字は必ず「3行以内」または「60文字以内」に収めること。別途、問題文や解説、ヒントは長文でも良い。
* **構成**: 1コマの中に、イラストと画像用の短い問題文が共存する形にします。

## 3. 問題作成のガイドライン
* **重視点**: 計算力だけでなく、文章から条件を整理し、筋道立てて答えを導くプロセス。
* **形式**: 穴埋め、記述、整序など。
* **重要**: イラストと問題文を見ただけで答えるのに必要な情報が全て含まれていること。`;
                            navigator.clipboard.writeText(prompt);
                            alert('Gemini3 (nanobanana2) 用の高品位プロンプトをクリップボードにコピーしました！');
                          }}
                          className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 underline flex items-center gap-1.5 mt-2 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          nanobanana2 高品位画像プロンプトをコピー
                        </button>
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

                  <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all">
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
                  <div className="flex items-start gap-3 mb-4 bg-white/10 p-4 rounded-xl border border-white/20">
                    <input
                      type="checkbox"
                      id="autoBalance"
                      checked={autoBalance}
                      onChange={e => setAutoBalance(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded appearance-none cursor-pointer bg-white/20 checked:bg-indigo-500 border border-white/30 checked:border-indigo-500 transition-all flex-shrink-0 relative before:content-['✓'] before:absolute before:text-white before:text-[10px] before:font-bold before:opacity-0 checked:before:opacity-100 before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 leading-none"
                    />
                    <label htmlFor="autoBalance" className="text-xs md:text-sm font-bold text-indigo-50 cursor-pointer leading-relaxed">
                      💡 <span className="text-amber-300">自動バランス生成</span>：0歳〜18歳の全対象年齢×全ジャンルを分析し、現在クイズが一番少ないところに自動で割り当てて生成します。
                    </label>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1 pr-1">生成エンジン</label>
                      <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-[11px] outline-none focus:bg-white/20 transition-all">
                        {AI_MODELS.map((m: any) => <option key={m.id} value={m.id} className="text-zinc-800">{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">画像生成</label>
                      <div className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-[11px] text-indigo-50">
                        JA生成後にEN/ZHを派生
                      </div>
                    </div>
                    <div className={`space-y-1 transition-opacity ${autoBalance ? 'opacity-30' : ''}`}>
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">ジャンル</label>
                      <select disabled={autoBalance} value={aiCategoryId} onChange={e => setAiCategoryId(e.target.value)} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white/20 transition-all">
                        <option value="all" className="text-zinc-800">全ジャンル (各最大2個)</option>
                        {categoriesList.map((c: any) => <option key={c.id} value={c.id} className="text-zinc-800">{c.nameJa || c.name}</option>)}
                      </select>
                    </div>
                    <div className={`space-y-1 transition-opacity ${autoBalance ? 'opacity-30' : ''}`}>
                      <label className="text-[10px] font-black text-indigo-200 uppercase ml-1">対象年齢</label>
                      <input disabled={autoBalance} type="number" value={aiTargetAge} onChange={e => setAiTargetAge(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-sm outline-none focus:bg-white/20 transition-all" />
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
                  <button type="submit" disabled={bulkLoading || loading} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-xl hover:bg-orange-50 active:scale-95 transition-all text-sm mb-4">
                    {bulkLoading ? '🤖 自動トピック考案 & 生成中...' : 'バルク生成を開始する ⚡️'}
                  </button>

                  <details className="text-[10px] bg-black/10 rounded-xl p-4 border border-white/10">
                    <summary className="cursor-pointer font-black text-indigo-200">🕒 定期的な自動公開（Cron）の設定方法</summary>
                    <div className="mt-3 space-y-3 text-indigo-100 font-medium">
                      <p>Cloudflare Workers Cron Triggers等を利用して、以下のURLにアクセスすることで定期生成が可能です：</p>
                      <code className="block bg-black/30 p-2.5 rounded text-[10px] text-white break-all border border-white/5">
                        /api/admin/cron?secret=YOUR_SECRET
                      </code>
                      <p className="opacity-70 leading-relaxed font-bold">
                        1. 環境変数 <code>CRON_SECRET</code> を定義してください。<br />
                        2. <code>?secret=...</code> にその値を指定してGETリクエストを送ると、全ジャンルのクイズが自動で1つずつ生成されます。
                      </p>
                    </div>
                  </details>
                </form>
              </div>
            </div>
          )}


          {mainTab === 'categories' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6">ジャンル管理</h2>
              <form onSubmit={handleSaveCategory} className="space-y-4 mb-8 bg-[var(--background)] p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">日本語名</label>
                    <input type="text" required placeholder="例: 数学" value={catFormData.nameJa} onChange={e => setCatFormData({ ...catFormData, nameJa: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">英語名</label>
                    <input type="text" placeholder="Example: Math" value={catFormData.nameEn} onChange={e => setCatFormData({ ...catFormData, nameEn: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">中国語名</label>
                    <input type="text" placeholder="例如: 数学" value={catFormData.nameZh} onChange={e => setCatFormData({ ...catFormData, nameZh: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">最小年齢</label>
                    <input type="number" placeholder="最小年齢" value={catFormData.minAge} onChange={e => setCatFormData({ ...catFormData, minAge: parseInt(e.target.value) })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">最大年齢</label>
                    <input type="number" placeholder="最大年齢 (任意)" value={catFormData.maxAge} onChange={e => setCatFormData({ ...catFormData, maxAge: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">アイコン</label>
                    <select value={catFormData.icon} onChange={e => setCatFormData({ ...catFormData, icon: e.target.value })} className="w-full border p-3 rounded-xl font-bold bg-white dark:bg-zinc-900">
                      <option value="">なし</option>
                      {ICONS.map(icon => (
                        <option key={icon.id} value={icon.id}>{icon.name}</option>
                      ))}
                    </select>
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
                <thead><tr className="text-left border-b font-black text-xs text-zinc-400 uppercase tracking-wider"><th className="pb-4 w-16">順序</th><th className="pb-4 w-12">アイコン</th><th className="pb-4">ジャンル</th><th className="pb-4">対象年齢</th><th className="pb-4">プロンプト</th><th className="pb-4 text-right">操作</th></tr></thead>
                <tbody>
                  {categoriesList.map((c: any, index: number) => (
                    <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(c.id, 'up')}
                            disabled={index === 0}
                            className={`p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:enabled:bg-amber-100 transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="上へ"
                          >
                            <img src="/icons/chevron-up.svg" alt="" className="w-3 h-3 opacity-70 grayscale" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(c.id, 'down')}
                            disabled={index === categoriesList.length - 1}
                            className={`p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:enabled:bg-amber-100 transition-colors ${index === categoriesList.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="下へ"
                          >
                            <img src="/icons/chevron-down.svg" alt="" className="w-3 h-3 opacity-70 grayscale" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        {c.icon && (
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <img src={`/icons/${c.icon}`} alt="" className="w-5 h-5 text-zinc-500" style={{ filter: 'grayscale(100%) opacity(0.6)' }} />
                          </div>
                        )}
                      </td>
                      <td className="py-4 font-bold">
                        <div>{c.nameJa || c.name || <span className="text-zinc-300 italic">(名称未設定)</span>}</div>
                        <div className="text-xs text-zinc-400 font-semibold">{c.nameEn || '-'}</div>
                        <div className="text-xs text-zinc-400 font-semibold">{c.nameZh || '-'}</div>
                      </td>
                      <td className="text-sm font-bold">{c.minAge}歳 〜 {c.maxAge ? `${c.maxAge}歳` : 'なし'}</td>
                      <td>
                        {c.systemPrompt ? (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">設定済み</span>
                        ) : (
                          <span className="text-[10px] bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full font-black">未設定</span>
                        )}
                      </td>
                      <td className="text-right space-x-1">
                        <button type="button" onClick={() => { setEditingCatId(c.id); setCatFormData({ nameJa: c.nameJa || c.name || '', nameEn: c.nameEn || '', nameZh: c.nameZh || '', minAge: c.minAge, maxAge: c.maxAge || '', systemPrompt: c.systemPrompt || '', icon: c.icon || '' }); }} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"><img src="/icons/edit.svg" alt="" className="w-4 h-4 opacity-70 grayscale" /></button>
                        <button type="button" onClick={() => handleDeleteCategory(c.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><img src="/icons/delete.svg" alt="" className="w-4 h-4 opacity-70 grayscale" /></button>
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
                    <select value={formData.categoryId} onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                      {categoriesList.map((c: any) => <option key={c.id} value={c.id}>{c.nameJa || c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">適正年齢</label>
                    <input type="number" value={formData.targetAge} placeholder="適正年齢" onChange={e => setFormData(prev => ({ ...prev, targetAge: Number(e.target.value) }))} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex gap-2">
                    {SUPPORTED_LOCALES.map(loc => (
                      <button key={loc} type="button" onClick={() => setActiveTab(loc)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${activeTab === loc ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>{loc.toUpperCase()}</button>
                    ))}
                  </div>
                  {activeTab === 'ja' && (
                    <button
                      type="button"
                      onClick={handleAiTranslate}
                      disabled={loading || !formData.translations.ja.title || !formData.translations.ja.question}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95"
                    >
                      <span className="text-sm">✨</span> AIで他言語に翻訳・反映
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-[var(--background)] p-6 rounded-2xl border-2 border-dashed border-[var(--border)]">
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
                        <input type="text" placeholder="画像URL (任意)" value={formData.imageUrl} onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))} className="w-full border p-3 rounded-xl text-sm font-bold bg-white dark:bg-zinc-900" />
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e)} className="hidden" id="global-image-upload" />
                          <label htmlFor="global-image-upload" className={`inline-block px-6 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${uploading.global ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-800 text-white hover:bg-black'}`}>
                            {uploading.global ? 'アップロード中...' : 'ファイルを選択...'}
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const title = currentTranslation.title || formData.translations.ja?.title || '未入力';
                            const question = currentTranslation.question || formData.translations.ja?.question || '未入力';
                            const type = currentTranslation.type || formData.translations.ja?.type || 'TEXT';
                            const options = type === 'CHOICE' ? (currentTranslation.options || formData.translations.ja?.options || '未入力') : 'なし (記述式)';
                            const answer = currentTranslation.answer || formData.translations.ja?.answer || '未入力';
                            const hintText = currentTranslation.hint || formData.translations.ja?.hint || '未入力';
                            const explText = currentTranslation.explanation || formData.translations.ja?.explanation || '未入力';

                            const prompt = `以下のテーマについて、教育的で視覚的に魅力的な、非常に高画質でディティールの豊富なイラストを生成してください。
タイトル: ${title}
問題文: ${question}
選択肢・記述式: ${options}
正解: ${answer}
ヒント: ${hintText}
解説: ${explText}

## 1. 作成プロセス
1. **思考フェーズ**: 指定された条件で、読解力と論理的思考が必要な「問題文」と「正解・解説」を内部で決定します。
2. **画像生成フェーズ**: 決定した問題文を配置した挿絵画像を生成します。
3. **出力フェーズ**: 生成された画像の下に、決定しておいた「テキスト情報」を出力します。

## 2. 画像生成の制約事項
* **アスペクト比**: 8k解像度（横型 16:9）。
* **デザイン**: 低年齢向けは子供がワクワクする「絵本や児童書の挿絵風」イラスト。高学年から高校生は上質な科学教材や教育図解のような詳細なイラストまたはフォトリアルな写真。ディティールは詳細に描くこと。 nanobanana2スタイル、高品位、極めて詳細なディティール、傑作、色鮮やかで学習意欲を高める魅力的な構図。
* **言語**: 画像内のテキストは、必ず「\${activeTab === 'ja' ? '日本語' : activeTab === 'en' ? '英語' : '中国語'}」で作成してください。
* **文字の配置**: 画像内に問題文を配置すること。文字は可愛らしく、読みやすくレイアウトしてください。
* **文字数制限**: 画像に重ねる文字は必ず「3行以内」または「60文字以内」に収めること。別途、問題文や解説、ヒントは長文でも良い。
* **構成**: 1コマの中に、イラストと画像用の短い問題文が共存する形にします。

## 3. 問題作成のガイドライン
* **重視点**: 計算力だけでなく、文章から条件を整理し、筋道立てて答えを導くプロセス。
* **形式**: 穴埋め、記述、整序など。
* **重要**: イラストと問題文を見ただけで答えるのに必要な情報が全て含まれていること。`;
                            navigator.clipboard.writeText(prompt);
                            alert('Gemini3 (nanobanana2) 用の高品位プロンプトをクリップボードにコピーしました！');
                          }}
                          className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 underline flex items-center gap-1.5 mt-2 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          nanobanana2 高品位画像プロンプトをコピー
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-[var(--border)] border-dashed">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">この言語専用の画像 (任意)</p>
                      {currentTranslation.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], imageUrl: '' } } }))}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          画像をクリア
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="relative w-28 aspect-video bg-white dark:bg-black rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
                        {currentTranslation.imageUrl || formData.imageUrl ? (
                          <img src={currentTranslation.imageUrl || formData.imageUrl} alt="Tab Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-300 text-center px-1">画像なし</div>
                        )}
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <input
                          type="text"
                          placeholder="個別画像URL"
                          value={currentTranslation.imageUrl || ''}
                          onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], imageUrl: e.target.value } } }))}
                          className="w-full border p-2.5 rounded-xl text-[11px] font-bold bg-white dark:bg-zinc-900 shadow-sm"
                        />
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, activeTab)} className="hidden" id={`tab-image-upload-${activeTab}`} />
                          <label htmlFor={`tab-image-upload-${activeTab}`} className={`inline-block px-4 py-1.5 rounded-lg text-[9px] font-black cursor-pointer transition-all ${uploading[activeTab] ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-700 text-white hover:bg-black'}`}>
                            {uploading[activeTab] ? 'アップロード中...' : 'ファイルを選択...'}
                          </label>

                          {activeTab !== 'ja' && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (uploading[activeTab]) return;
                                const baseImageUrl = formData.translations.ja?.imageUrl || formData.imageUrl;
                                if (!baseImageUrl) {
                                  alert('日本語の画像が設定されていません。一度日本語版を保存するか、画像をアップロードしてください。');
                                  return;
                                }

                                setUploading(prev => ({ ...prev, [activeTab]: true }));
                                try {
                                  const res = await fetch('/api/admin/quiz/regenerate-image', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      quizId: (formData as any).id,
                                      locale: activeTab,
                                      title: currentTranslation.title || 'Untitled',
                                      baseImageUrl
                                    })
                                  });
                                  const data = (await res.json()) as any;
                                  if (data.imageUrl) {
                                    setFormData(prev => ({
                                      ...prev,
                                      translations: {
                                        ...prev.translations,
                                        [activeTab]: { ...prev.translations[activeTab], imageUrl: data.imageUrl }
                                      }
                                    }));
                                  } else {
                                    alert('生成に失敗しました: ' + (data.error || '不明なエラー'));
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert('通信エラーが発生しました');
                                } finally {
                                  setUploading(prev => ({ ...prev, [activeTab]: false }));
                                }
                              }}
                              className={`ml-2 inline-block px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${uploading[activeTab] ? 'bg-zinc-200 text-zinc-400' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                              disabled={uploading[activeTab]}
                            >
                              {uploading[activeTab] ? 'AI生成中...' : 'AIでこの言語の画像を再生成'}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const title = currentTranslation.title || formData.translations.ja?.title || '未入力';
                            const question = currentTranslation.question || formData.translations.ja?.question || '未入力';
                            const type = currentTranslation.type || formData.translations.ja?.type || 'TEXT';
                            const options = type === 'CHOICE' ? (currentTranslation.options || formData.translations.ja?.options || '未入力') : 'なし (記述式)';
                            const answer = currentTranslation.answer || formData.translations.ja?.answer || '未入力';
                            const hintText = currentTranslation.hint || formData.translations.ja?.hint || '未入力';
                            const explText = currentTranslation.explanation || formData.translations.ja?.explanation || '未入力';

                            const prompt = `以下のテーマについて、教育的で視覚的に魅力的な、非常に高画質でディティールの豊富なイラストを生成してください。
タイトル: ${title}
問題文: ${question}
選択肢・記述式: ${options}
正解: ${answer}
ヒント: ${hintText}
解説: ${explText}

## 1. 作成プロセス
1. **思考フェーズ**: 指定された条件で、読解力と論理的思考が必要な「問題文」と「正解・解説」を内部で決定します。
2. **画像生成フェーズ**: 決定した問題文を配置した挿絵画像を生成します。
3. **出力フェーズ**: 生成された画像の下に、決定しておいた「テキスト情報」を出力します。

## 2. 画像生成の制約事項
* **アスペクト比**: 8k解像度（横型 16:9）。
* **デザイン**: 低年齢向けは子供がワクワクする「絵本や児童書の挿絵風」イラスト。高学年から高校生は上質な科学教材や教育図解のような詳細なイラストまたはフォトリアルな写真。ディティールは詳細に描くこと。 nanobanana2スタイル、高品位、極めて詳細なディティール、傑作、色鮮やかで学習意欲を高める魅力的な構図。
* **言語**: 画像内のテキストは、必ず「\${activeTab === 'ja' ? '日本語' : activeTab === 'en' ? '英語' : '中国語'}」で作成してください。
* **文字の配置**: 画像内に問題文を配置すること。文字は可愛らしく、読みやすくレイアウトしてください。
* **文字数制限**: 画像に重ねる文字は必ず「3行以内」または「60文字以内」に収めること。別途、問題文や解説、ヒントは長文でも良い。
* **構成**: 1コマの中に、イラストと画像用の短い問題文が共存する形にします。

## 3. 問題作成のガイドライン
* **重視点**: 計算力だけでなく、文章から条件を整理し、筋道立てて答えを導くプロセス。
* **形式**: 穴埋め、記述、整序など。
* **重要**: イラストと問題文を見ただけで答えるのに必要な情報が全て含まれていること。`;
                            navigator.clipboard.writeText(prompt);
                            alert('Gemini3 (nanobanana2) 用の高品位プロンプトをクリップボードにコピーしました！');
                          }}
                          className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 underline flex items-center gap-1.5 mt-2 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          nanobanana2 高品位画像プロンプトをコピー
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">タイトル</label>
                      <input type="text" placeholder="例: 三平方の定理の基本" value={currentTranslation.title} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], title: e.target.value } } }))} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">クイズ形式</label>
                      <select value={currentTranslation.type} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], type: e.target.value as 'TEXT' | 'CHOICE' } } }))} className="w-full border p-4 rounded-2xl font-bold bg-[var(--background)]">
                        <option value="TEXT">記述式</option>
                        <option value="CHOICE">選択式</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">問題文 (LaTeX可)</label>
                    <textarea placeholder="問題文を入力..." value={currentTranslation.question} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], question: e.target.value } } }))} className="w-full border p-4 rounded-2xl font-bold min-h-[120px]" />
                  </div>
                  {currentTranslation.type === 'CHOICE' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">選択肢 (カンマ区切り)</label>
                      <input type="text" placeholder="例: 選択肢1, 選択肢2, 選択肢3" value={currentTranslation.options} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], options: e.target.value } } }))} className="w-full border p-4 rounded-2xl font-bold bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30 shadow-inner" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">正解</label>
                      <input type="text" placeholder="例: 答えを入力" value={currentTranslation.answer} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], answer: e.target.value } } }))} className="w-full border p-4 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">ヒント</label>
                      <textarea placeholder="例: ヒントを入力" value={currentTranslation.hint} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], hint: e.target.value } } }))} className="w-full border p-4 rounded-2xl font-bold min-h-[120px]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">解説 (任意)</label>
                    <textarea placeholder="答えの理由や考え方、途中式などを入力..." value={currentTranslation.explanation} onChange={e => setFormData(prev => ({ ...prev, translations: { ...prev.translations, [activeTab]: { ...prev.translations[activeTab], explanation: e.target.value } } }))} className="w-full border p-4 rounded-2xl font-bold min-h-[120px]" />
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
                  <button type="button" onClick={() => setShowPreview(!showPreview)} className="text-xs font-bold text-blue-500">
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
                    {currentTranslation.explanation && (
                      <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase">Explanation</p>
                        <LatexRenderer text={currentTranslation.explanation} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300" />
                      </div>
                    )}
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
                      type="button"
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

              <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
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
                <a href="https://www.prisma.io/studio" target="_blank" rel="noopener noreferrer" className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] hover:scale-[1.02] hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">💎</span>
                    <div>
                      <h3 className="text-lg font-black">Prisma Studio</h3>
                      <p className="text-xs font-bold text-zinc-500">Database GUI & Docs</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    SQLite の中身を確認・編集するときの公式ガイドです。実際に使うときはサーバー上で Prisma Studio を起動するか、SSHトンネル経由で開く運用を想定しています。
                    <br />
                    <span className="text-[10px] text-zinc-400 italic">※ 本番サーバーでは `localhost:5555` の直接リンクは使いにくいため、公式ガイドへの導線に変更しています</span>
                  </p>
                  <div className="flex items-center text-xs font-black text-emerald-600 gap-1">
                    公式ページへ <span className="text-lg">→</span>
                  </div>
                </a>

                <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] hover:scale-[1.02] hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">🔑</span>
                    <div>
                      <h3 className="text-lg font-black">Clerk Dashboard</h3>
                      <p className="text-xs font-bold text-zinc-500">User Auth / OAuth / Domains</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    ユーザーの管理、Googleログイン設定、許可ドメイン、Webhook など Clerk 本番運用の設定を行います。
                  </p>
                  <div className="flex items-center text-xs font-black text-indigo-600 gap-1">
                    ダッシュボードへ <span className="text-lg">→</span>
                  </div>
                </a>

                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] hover:scale-[1.02] hover:shadow-xl transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 -mr-8 -mt-8 rotate-45"></div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-amber-100 text-amber-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">✨</span>
                    <div>
                      <h3 className="text-lg font-black">Google AI Studio</h3>
                      <p className="text-xs font-bold text-zinc-500">Gemini API & Setup</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    AI生成の要となるGemini APIの管理、APIキーの発行、最新モデルのドキュメントにアクセスできます。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    <a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-[11px] font-black text-amber-700 dark:text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all">
                      APIキーの発行・管理 <span>🔑</span>
                    </a>
                    <a href="https://ai.google.dev/gemini-api/docs" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-white transition-all">
                      APIドキュメント <span>📚</span>
                    </a>
                    <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-white transition-all">
                      AI Studio (Prompt Lab) <span>🧪</span>
                    </a>
                    <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-white transition-all">
                      料金・クォータ制限 <span>💰</span>
                    </a>
                  </div>
                </div>

                <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] hover:scale-[1.02] hover:shadow-xl transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 -mr-8 -mt-8 rotate-45"></div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-orange-100 text-orange-600 p-3 rounded-2xl text-2xl group-hover:rotate-12 transition-transform">☁️</span>
                    <div>
                      <h3 className="text-lg font-black">Xserver / Ubuntu Ops</h3>
                      <p className="text-xs font-bold text-zinc-500">Server & Deployment</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                    現在の本番構成に合わせて、Xserver VPS・Nginx・PM2・SQLite の運用導線へ更新しています。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    <a href="https://www.xserver.ne.jp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-orange-50 dark:bg-orange-900/10 text-[11px] font-black text-orange-700 dark:text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all">
                      Xserver 公式サイト <span>🖥️</span>
                    </a>
                    <a href="https://nginx.org/en/docs/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-white transition-all">
                      Nginx ドキュメント <span>🌐</span>
                    </a>
                    <a href="https://pm2.keymetrics.io/docs/usage/quick-start/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-white transition-all">
                      PM2 クイックスタート <span>⚙️</span>
                    </a>
                    <a href="https://www.sqlite.org/docs.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-white transition-all">
                      SQLite ドキュメント <span>🗄️</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
          {mainTab === 'backup' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span className="bg-amber-100 p-2 rounded-xl text-lg">💾</span>
                  バックアップ・復元
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Export */}
                  <div className="space-y-4 p-6 border rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-inner">
                    <h3 className="font-bold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                      <span>📤</span> 分割エクスポート
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
                      データが大きくなりすぎないよう、種類別にダウンロードできます。
                    </p>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => handleExportBackup('db')}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        🗄️ クイズ・設定データを保存
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportBackup('users')}
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold shadow-sm hover:bg-emerald-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        👤 ユーザー・成績データを保存
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportBackup('images')}
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-bold shadow-sm hover:bg-purple-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        🖼️ 画像データを保存 (ZIP形式)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleDirectDbDownload}
                      className="w-full mt-2 bg-zinc-100 text-zinc-600 py-2 rounded-xl text-[10px] font-black hover:bg-zinc-200 transition-all border border-zinc-200"
                    >
                      SQLiteファイルを直接ダウンロード（開発用）
                    </button>
                  </div>

                  {/* Import */}
                  <div className="space-y-4 p-6 border rounded-2xl bg-red-50/30 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                    <h3 className="font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                      <span>📥</span> 復元（スマートインポート）
                    </h3>
                    <p className="text-[11px] text-red-600/70 dark:text-red-400/80 leading-relaxed font-medium">
                      ⚠️ 警告: ファイルをアップロードすると、<br /><strong className="text-red-600 dark:text-red-300">「そのファイルに含まれている種類のデータのみ」</strong>が現在のアプリから削除され、ファイルの内容で完全に上書きされます（例: 画像バックアップを復元した場合は、画像データのみがクリア・復元され、クイズやユーザーはそのまま残ります）。
                    </p>
                    <div className="relative cursor-pointer mt-4">
                      <input
                        type="file"
                        accept=".json,.zip,.tgz,.tar.gz"
                        onChange={handleImportBackup}
                        className="hidden"
                        id="backup-upload"
                        disabled={loading}
                      />
                      <label
                        htmlFor="backup-upload"
                        className="w-full flex items-center justify-center bg-zinc-800 text-white py-3.5 rounded-xl font-black shadow-lg shadow-black/20 hover:bg-black cursor-pointer transition-all"
                      >
                        {loading ? '処理中...' : 'バックアップファイル (JSON / ZIP) を選択 📂'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                  <h4 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-2">仕様上の注意</h4>
                  <ul className="text-[10px] text-amber-600 dark:text-amber-500/80 space-y-1 font-medium list-disc list-inside">
                    <li>エクスポートデータは「DB(JSON)」「ユーザー(JSON)」「画像(ZIP)」に分離してダウンロードできます。</li>
                    <li>ユーザーデータの復元では、Clerk自体のアカウントは復元されず、DB上のユーザー紐付けのみを復元します（ただし現在ログイン中の管理者は保護されます）。</li>
                    <li>復元は、選択したファイルに含まれる種類のデータのみを上書きリセットします。</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'system-tools' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="bg-zinc-100 text-zinc-600 p-2 rounded-xl text-lg">🛠️</span>
                システムツール
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cache Clear */}
                <div className="space-y-4 p-6 border rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-inner">
                  <h3 className="font-bold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <span>🧹</span> キャッシュをクリア
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Next.jsの表示キャッシュ（Data Cache / Router Cache）を削除します。変更がフロントエンドに反映されない場合に実行してください。
                  </p>
                  <p className="text-[10px] text-amber-600 font-bold">
                    ※ データベース（クイズデータやユーザー履歴）やアップロード済みの画像は削除されません。
                  </p>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={loading}
                    className="w-full bg-zinc-800 text-white py-3 rounded-xl font-black shadow-lg shadow-black/20 hover:bg-black transition-all disabled:opacity-50"
                  >
                    {loading ? '処理中...' : 'キャッシュをクリアする'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'comments' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="bg-amber-100 text-amber-600 p-2 rounded-xl text-lg">💬</span>
                コメント管理
                <span className="ml-auto text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold px-3 py-1 rounded-full">{comments.length}件</span>
              </h2>

              <div className="flex flex-col gap-4">
                {comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] hover:border-blue-300 transition-colors group">
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md">
                            {comment.userName}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {formatAdminTimestamp(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed break-words whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 border-t border-[var(--border)] pt-2 lg:border-none lg:pt-0">
                          <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">対象クイズ</span>
                          <span className="text-[11px] font-bold text-zinc-500 truncate" title={comment.quizTitle}>
                            <LatexRenderer text={comment.quizTitle} />
                          </span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 flex-shrink-0">
                        <a href={`/watch/${comment.quizId}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-black text-blue-500 hover:text-blue-600 border border-blue-200 hover:border-blue-400 bg-blue-50/50 px-3 py-1.5 rounded-xl transition-colors">
                          確認 ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-[11px] font-black text-red-500 hover:text-white border border-red-200 hover:bg-red-500 hover:border-red-500 bg-red-50/50 px-3 py-1.5 rounded-xl transition-colors"
                          disabled={loading}
                        >
                          {loading ? '処理中...' : '削除 🗑️'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-12 text-zinc-500 font-bold border border-dashed border-[var(--border)] rounded-2xl">
                    コメントはまだありません
                  </div>
                )}
              </div>
            </div>
          )}

          {mainTab === 'education' && (
            <div className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 p-2 rounded-xl text-lg">📚</span>
                  教育課程データ（学習要項）管理
                </h2>
                <button
                  onClick={handleSaveEduData}
                  disabled={loading || !eduData}
                  className="bg-blue-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {loading ? '保存中...' : '設定を保存する'}
                </button>
              </div>

              {!eduData ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 font-bold mb-4">設定データがまだありません。</p>
                  <button
                    onClick={() => {
                      setEduData(getDefaultEducationalGuidelines());
                    }}
                    className="text-blue-500 font-black hover:underline"
                  >
                    初期設定データを読み込む
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/30">
                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2">学習指導要領の充足チェック</p>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                      AI はこのデータを題材選定と教育文脈の参照に使います。科目が欠けていたり説明が薄いと、生成される問題の幅と精度が落ちやすくなります。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {eduValidation.map((item: any) => (
                        <span
                          key={item.group}
                          className={`px-3 py-1 rounded-full text-[11px] font-black ${item.missingSubjects.length === 0 && item.emptySubjects.length === 0
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                            }`}
                        >
                          {item.group}: 欠落 {item.missingSubjects.length} / 空欄 {item.emptySubjects.length}
                        </span>
                      ))}
                    </div>
                    {activeEduValidation && (activeEduValidation.missingSubjects.length > 0 || activeEduValidation.emptySubjects.length > 0) && (
                      <div className="mt-3 text-xs font-bold text-amber-800 dark:text-amber-300 space-y-1">
                        {activeEduValidation.missingSubjects.length > 0 && <p>未登録科目: {activeEduValidation.missingSubjects.join('、')}</p>}
                        {activeEduValidation.emptySubjects.length > 0 && <p>内容未入力: {activeEduValidation.emptySubjects.join('、')}</p>}
                      </div>
                    )}
                  </div>

                  {/* 学年層の切り替え */}
                  <div className="flex gap-2 bg-[var(--background)] p-1.5 rounded-2xl border border-[var(--border)] overflow-x-auto no-scrollbar">
                    {(['小学校', '中学校', '高等学校'] as const).map((group) => (
                      <button
                        key={group}
                        onClick={() => setEduGroup(group)}
                        className={`flex-1 px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${eduGroup === group ? 'bg-white shadow-sm text-blue-600' : 'text-zinc-400 hober:text-zinc-600'}`}
                      >
                        {group} ({eduData[group]?.ageRange})
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEduData(normalizeEducationalGuidelines(eduData))}
                        className="px-4 py-2 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-black text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        不足科目を既定値で補完
                      </button>
                      <button
                        type="button"
                        onClick={() => setEduData(getDefaultEducationalGuidelines())}
                        className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-black text-zinc-600 hover:bg-zinc-50 transition-all"
                      >
                        既定の教育課程データに戻す
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {Object.entries(eduData[eduGroup]?.content || {}).map(([subject, content]: [string, any]) => (
                        <div key={subject} className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{subject}</label>
                          <textarea
                            value={content as string}
                            onChange={(e) => {
                              const newData = { ...eduData };
                              newData[eduGroup].content[subject] = e.target.value;
                              setEduData(newData);
                            }}
                            className="w-full border p-4 rounded-2xl font-bold min-h-[80px] text-sm bg-[var(--background)] focus:bg-white transition-colors"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">💡 科目の追加・削除</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const name = prompt('新しい科目名を入力してください（例: 情報、技術）');
                            if (name) {
                              const newData = { ...eduData };
                              newData[eduGroup].content[name] = "";
                              setEduData(newData);
                            }
                          }}
                          className="px-4 py-2 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-black text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          + 新しい科目を追加
                        </button>
                        <button
                          onClick={() => {
                            const subjects = Object.keys(eduData[eduGroup].content);
                            const name = prompt(`削除する科目名を入力してください:\n${subjects.join(', ')}`);
                            if (name && eduData[eduGroup].content[name] !== undefined) {
                              const newData = { ...eduData };
                              delete newData[eduGroup].content[name];
                              setEduData(newData);
                            }
                          }}
                          className="px-4 py-2 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900/50 rounded-lg text-xs font-black text-red-600 hover:bg-red-50 transition-all"
                        >
                          - 科目を削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

      </div>
      <Footer />

      {/* エラーログ表示用モーダル */}
      {restoreError && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl p-6 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
              <span>⚠️</span> 復元エラー
            </h3>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-4">
              以下のログを選択・コピーして、開発者へ報告してください。
            </p>
            <textarea
              className="w-full flex-1 p-4 text-[11px] font-mono bg-zinc-50 dark:bg-black text-red-700 dark:text-red-400 rounded-xl border-2 border-red-100 dark:border-red-900/30 overflow-auto focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none min-h-[300px]"
              readOnly
              value={restoreError}
              autoFocus
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRestoreError(null)}
                className="px-8 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-black transition-all"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
