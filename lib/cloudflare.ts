// Path: lib/cloudflare.ts
// Title: Cloudflare Context Wrapper
// Purpose: Safely get Cloudflare context without crashing in non-Cloudflare environments.

import { getCloudflareContext as getOriginalContext } from '@opennextjs/cloudflare';

export function getCloudflareContext(options?: { async?: boolean }): any {
  try {
    const context = getOriginalContext(options as any);
    if (!context) {
      return { env: process.env };
    }
    return context;
  } catch (e) {
    // If it fails (e.g., not initialized in Next.js config), fallback to process.env
    return { env: process.env };
  }
}

