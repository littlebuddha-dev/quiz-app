import { SignUp } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-[2rem] border border-sky-200/60 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-8 text-zinc-900 shadow-[0_24px_80px_rgba(14,165,233,0.12)] lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.35em] text-sky-500">Cue</div>
              <h1 className="mt-4 text-4xl font-black leading-tight">
                学びの記録を、
                <br />
                自分のアカウントで。
              </h1>
              <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-zinc-600">
                学習履歴やおすすめを保存して、いつでも同じ続きから始められます。
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-6 backdrop-blur">
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400">Getting Started</div>
              <div className="mt-3 space-y-3 text-sm font-semibold text-zinc-600">
                <p>年齢に合ったおすすめを自動表示</p>
                <p>間違えた問題をあとから復習</p>
                <p>成長に合わせて学習コースを整理</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl shadow-zinc-950/5 sm:p-6">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/onboarding"
              forceRedirectUrl={undefined}
            />
            
            {/* パスワード設定のヒント */}
            <div className="mt-6 p-4 rounded-3xl bg-amber-50/50 border border-amber-100/50 text-amber-900/80">
              <div className="flex items-center gap-2 mb-2 text-sm font-black text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                </svg>
                パスワード設定のヒント
              </div>
              <p className="text-xs font-bold leading-relaxed opacity-80">
                一般的な単語や単純な英数字のみの組み合わせは、セキュリティ保護（情報漏洩対策）のため拒否される場合があります。
                <span className="text-amber-600"> 記号（! @ # $ % など）を混ぜる</span>と、より安全で承認されやすくなります。
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
