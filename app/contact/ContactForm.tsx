'use client';

import { useState } from 'react';

const CONTACT_EMAIL = 'apple.darwin@gmail.com';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = `Cue Contact from ${name || 'Anonymous'}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Message:',
      message,
    ].join('\n');

    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="contact-name" className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-4 font-bold outline-none focus:border-amber-400"
          placeholder="お名前"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-email" className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-4 font-bold outline-none focus:border-amber-400"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-message" className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
          Message
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[180px] w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-4 font-bold outline-none focus:border-amber-400"
          placeholder="ご用件をご記入ください"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-amber-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.99]"
      >
        メールを作成する
      </button>

      <p className="text-xs leading-6 text-zinc-400">
        送信ボタンを押すと、メールアプリが起動し、入力内容が入った新規メールが作成されます。
      </p>
    </form>
  );
}
