// Path: proxy.ts
// Title: Clerk Proxy
// Purpose: Protects application routes requiring authentication while keeping public pages accessible.

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// ログインしていなくてもアクセス可能なパブリックなルートを定義
const isPublicRoute = createRouteMatcher([
  '/',
  '/admin(.*)',
  '/api/admin(.*)',
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
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // パブリックルート以外はログインを要求する
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Next.jsのスタティックファイル等を無視し、必要なリクエストでのみプロキシを発動させる
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
