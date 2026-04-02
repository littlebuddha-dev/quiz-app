import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const STORAGE_KEY = 'cue-locale';

function normalizeLocale(value?: string | null) {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('zh')) return 'zh';
  return null;
}

// ログインしていなくてもアクセス可能なパブリックなルートを定義
const isPublicRoute = createRouteMatcher([
  '/',
  '/new(.*)',
  '/popular(.*)',
  '/age(.*)',
  '/category/(.*)',
  '/channel/(.*)',
  '/sign-in(.*)',
  '/sign-out(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/game(.*)',
  '/ranking(.*)',
  '/analysis(.*)',
  '/courses(.*)',
  '/watch/(.*)',
  '/api/comments(.*)',
  '/api/webhooks(.*)',
  '/api/quiz-generator(.*)',
  '/api/topic-planner(.*)',
  '/api/translation(.*)',
  '/api/user/actions(.*)',
  '/api/user/status(.*)',
  '/api/auth/sync(.*)',
  '/about(.*)',
  '/contact(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/about(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // パブリックルート以外はログインを要求する
    await auth.protect();
  }

  // Content Security Policy (CSP) の設定
  // 開発環境 (localhost) では SSL がない場合が多いため、upgrade-insecure-requests を除外する
  const isDev = process.env.NODE_ENV === 'development';
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:;
    style-src 'self' 'unsafe-inline' https: http:;
    img-src 'self' data: https: http: blob:;
    font-src 'self' data: https: http:;
    connect-src 'self' https: http:;
    frame-src 'self' https: http:;
    worker-src 'self' blob:;
    ${isDev ? '' : 'upgrade-insecure-requests;'}
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  const langParam = normalizeLocale(request.nextUrl.searchParams.get('lang'));
  if (langParam) {
    requestHeaders.set('x-cue-locale', langParam);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', cspHeader);
  if (langParam) {
    response.cookies.set(STORAGE_KEY, langParam, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return response;
}, { clockSkewInMs: 30000 });

export const config = {
  matcher: [
    // Next.jsのスタティックファイル等を無視し、必要なリクエストでのみプロキシを発動させる
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
