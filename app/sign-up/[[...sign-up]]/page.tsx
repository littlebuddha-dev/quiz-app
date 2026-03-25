import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
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
          </section>
        </div>
      </div>
    </main>
  );
}
