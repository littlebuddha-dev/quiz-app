'use client';

import Link from 'next/link';
import Footer from '../components/Footer';

const sections = [
  {
    title: '1. 取得する情報',
    body: '当サービスは、アカウント情報、利用履歴、お問い合わせ内容、端末やブラウザに関する基本的な技術情報など、サービス提供に必要な範囲で情報を取得することがあります。',
  },
  {
    title: '2. 利用目的',
    body: '取得した情報は、サービス提供、本人確認、機能改善、不正利用防止、サポート対応、重要なお知らせの配信、利用状況の分析のために利用します。',
  },
  {
    title: '3. 情報の共有',
    body: '法令に基づく場合、本人の同意がある場合、または業務委託先に必要な範囲で提供する場合を除き、個人情報を第三者へ提供しません。',
  },
  {
    title: '4. 保存期間と管理',
    body: '取得した情報は、利用目的に必要な期間保存し、漏えい・改ざん・不正アクセスを防止するための合理的な安全管理措置を講じます。',
  },
  {
    title: '5. Cookie等の利用',
    body: '利便性向上、アクセス解析、表示最適化のためにCookieや類似技術を利用する場合があります。ブラウザ設定により無効化できる場合があります。',
  },
  {
    title: '6. ユーザーの権利',
    body: 'ユーザーは、法令の範囲内で、自己の個人情報について開示、訂正、削除、利用停止などを求めることができます。',
  },
  {
    title: '7. 改定',
    body: '本ポリシーは、必要に応じて予告なく改定されることがあります。重要な変更がある場合は、サービス上で適切にお知らせします。',
  },
];

export default function PrivacyContent() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
        <Link href="/" className="text-sm font-black text-amber-600 hover:text-amber-500 transition-colors">
          ← Cueへ戻る
        </Link>
        <div className="mt-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 sm:p-12">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Privacy</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">プライバシーポリシー</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-500">
            本ページは一般的な内容をベースとしたプライバシーポリシーのダミー文面です。実運用時には、実際の取得情報・利用目的・外部サービス利用状況に合わせて見直してください。
          </p>
          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-black">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
