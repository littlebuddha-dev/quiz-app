// Path: app/components/ShareButton.tsx
// Title: SNS Share Button Component
// Purpose: クイズ結果をX(Twitter)、LINE、URLコピーで共有するボタン

'use client';

import { useState } from 'react';
import { Locale } from '../types';

interface ShareButtonProps {
  quizTitle: string;
  quizId: string;
  isCorrect: boolean;
  locale: Locale;
}

const SHARE_TEXT: Record<Locale, { correct: string; incorrect: string; cta: string; copied: string; share: string }> = {
  ja: {
    correct: 'に正解しました！🎉',
    incorrect: 'に挑戦しました！💪',
    cta: 'あなたも挑戦してみよう →',
    copied: 'コピーしました！',
    share: '結果を共有',
  },
  en: {
    correct: ' — Correct! 🎉',
    incorrect: ' — I gave it a try! 💪',
    cta: 'Try it yourself →',
    copied: 'Copied!',
    share: 'Share Result',
  },
  zh: {
    correct: ' 答对了！🎉',
    incorrect: ' 挑战了一下！💪',
    cta: '你也来试试 →',
    copied: '已复制！',
    share: '分享结果',
  },
};

export default function ShareButton({ quizTitle, quizId, isCorrect, locale }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = SHARE_TEXT[locale];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cue.example.com';
  const quizUrl = `${baseUrl}/watch/${quizId}`;
  const resultText = isCorrect ? t.correct : t.incorrect;
  const shareText = `Cueで「${quizTitle}」${resultText}\n${t.cta}\n${quizUrl}`;

  const shareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const shareToLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(quizUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    setShowMenu(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  };

  // ネイティブ Web Share API が使える場合はそちらを優先
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Cue - ${quizTitle}`,
          text: `${quizTitle}${resultText}`,
          url: quizUrl,
        });
        return;
      } catch {
        // ユーザーがキャンセルした場合は何もしない
      }
    }
    setShowMenu(!showMenu);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 bg-[var(--card)] border border-[var(--border)] text-zinc-500 hover:text-emerald-500 hover:border-emerald-500"
      >
        📤 {t.share}
      </button>

      {showMenu && (
        <>
          {/* 背景クリックで閉じる */}
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-full mb-2 right-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2 z-50 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={shareToX}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3 font-bold text-sm"
            >
              <span className="text-lg">𝕏</span>
              X (Twitter)
            </button>
            <button
              type="button"
              onClick={shareToLine}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3 font-bold text-sm"
            >
              <span className="text-lg">💚</span>
              LINE
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3 font-bold text-sm"
            >
              <span className="text-lg">📋</span>
              {copied ? t.copied : locale === 'ja' ? 'リンクをコピー' : locale === 'en' ? 'Copy Link' : '复制链接'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
