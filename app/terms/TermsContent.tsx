'use client';

import Footer from '../components/Footer';

export default function TermsContent() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
        <a href="/" className="text-sm font-black text-amber-600 hover:text-amber-500 transition-colors">
          ← Cueへ戻る
        </a>
        <div className="mt-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 sm:p-12 shadow-xl shadow-black/5">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Terms</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">利用規約</h1>
          <div className="mt-8 space-y-8 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            <section>
              <h2 className="text-lg font-black text-[var(--foreground)]">1. 適用</h2>
              <p className="mt-3">本規約は、Cueの提供するサービスの利用条件を定めるものです。ユーザーは、本規約に同意のうえ、本サービスを利用するものとします。</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-[var(--foreground)]">2. 禁止事項</h2>
              <p className="mt-3">ユーザーは、法令違反、公序良俗違反、不正アクセス、サービス運営の妨害、第三者の権利侵害などの行為を行ってはなりません。</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-[var(--foreground)]">3. ダミー文言</h2>
              <p className="mt-3">本ページには確認用のダミー文言として「マツシバデンキ」を記載しています。正式公開時には、実際の運営主体や契約条件に合わせて修正してください。</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-[var(--foreground)]">4. 免責</h2>
              <p className="mt-3">当サービスは、内容の正確性、完全性、有用性等について保証するものではありません。運営者は、サービス利用によって生じたいかなる損害についても、法令上許される範囲で責任を負わないものとします。</p>
            </section>
            <section>
              <h2 className="text-lg font-black text-[var(--foreground)]">5. 規約の変更</h2>
              <p className="mt-3">運営者は、必要に応じて本規約を変更できるものとし、変更後の内容はサービス上への掲載その他適切な方法で周知します。</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
