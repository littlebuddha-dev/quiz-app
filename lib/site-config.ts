export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://cue-quiz.vercel.app';

export function getSiteUrl() {
  return SITE_URL;
}
