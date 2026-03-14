// Path: proxy.ts
// Title: Clerk Middleware
// Purpose: Protects application routes requiring authentication while keeping public pages accessible.

export const runtime = 'edge';

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// ログインしていなくてもアクセス可能なパブリックなルートを定義
const isPublicRoute = createRouteMatcher([
  '/', 
  '/api/quiz-generator', // API系は一旦パブリック（フロントから呼ぶため）
  '/api/webhooks/clerk' // Webhook受信用
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // パブリックルート以外はログインを要求する
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Next.jsのスタティックファイル等を無視し、必要なリクエストでのみミドルウェアを発動させる
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
