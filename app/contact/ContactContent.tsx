'use client';

import Footer from '../components/Footer';
import ContactForm from './ContactForm';

export default function ContactContent() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <a href="/" className="text-sm font-black text-amber-600 hover:text-amber-500 transition-colors">
          ← Cueへ戻る
        </a>
        <div className="mt-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 sm:p-12 shadow-xl shadow-black/5">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Contact</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">お問い合わせ</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-500">
            ご質問・ご相談・不具合報告などがありましたら、以下のフォームからご連絡ください。
          </p>
          <ContactForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
