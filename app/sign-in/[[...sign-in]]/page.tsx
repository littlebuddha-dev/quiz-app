import { SignIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

function resolveRedirectUrl(raw?: string) {
  if (!raw || !raw.startsWith('/')) {
    return '/';
  }

  if (raw.startsWith('//')) {
    return '/';
  }

  return raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url: redirectUrlParam } = await searchParams;
  const redirectUrl = resolveRedirectUrl(redirectUrlParam);

  const { userId } = await auth();
  if (userId) {
    redirect(redirectUrl);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-[2rem] border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8 text-zinc-900 shadow-[0_24px_80px_rgba(251,146,60,0.12)] lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.35em] text-amber-500">Cue</div>
              <h1 className="mt-4 text-4xl font-black leading-tight">
                学ぶ楽しさに、
                <br />
                すぐ戻れるログイン。
              </h1>
              <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-zinc-600">
                クイズの履歴、いいね、保存、学習コースの進捗をそのまま引き継いで再開できます。
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-6 backdrop-blur">
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400">Quick Return</div>
              <div className="mt-3 space-y-3 text-sm font-semibold text-zinc-600">
                <p>前回の続きからすぐ再開</p>
                <p>間違い直しとおすすめを同期</p>
                <p>保護者・管理者アカウントにも対応</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl shadow-zinc-950/5 sm:p-6">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl={redirectUrl}
              forceRedirectUrl={undefined}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
