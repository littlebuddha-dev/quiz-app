// Path: lib/cloudflare.ts
// Title: Cloudflare Context Wrapper
// Purpose: Safely get Cloudflare context without crashing in non-Cloudflare environments.

import { getCloudflareContext as getOriginalContext } from '@opennextjs/cloudflare';

export function getCloudflareContext(options?: { async?: boolean }): any {
  // 開発環境またはローカル環境では、高コストなCloudflareコンテキスト取得をスキップして高速化する
  if (process.env.NODE_ENV === 'development' || !process.env.CF_PAGES) {
    const result = { env: process.env };
    return (options as any)?.async ? Promise.resolve(result) : result;
  }

  try {
    const context = getOriginalContext(options as any);
    if (!context) {
      return { env: process.env };
    }
    return context;
  } catch (e) {
    return { env: process.env };
  }
}

