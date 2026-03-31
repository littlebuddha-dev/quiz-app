export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://cue.college';

export function getSiteUrl() {
  return SITE_URL;
}
