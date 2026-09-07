'use client';

import Link from 'next/link';
import { usePreferredLocale } from '../hooks/usePreferredLocale';

const COPY = {
  ja: { message: '知るって、世界が広がること。', links: ['新着クイズ', '人気のクイズ', 'プライバシー', '利用規約', 'お問い合わせ'] },
  en: { message: 'A little curiosity. A wider world.', links: ['New quizzes', 'Popular quizzes', 'Privacy', 'Terms', 'Contact'] },
  zh: { message: '每一次发现，都让世界更开阔。', links: ['最新测验', '热门测验', '隐私政策', '使用条款', '联系我们'] },
};
const PATHS = ['/new', '/popular', '/privacy', '/terms', '/contact'];

export default function Footer() {
  const { locale } = usePreferredLocale();
  const t = COPY[locale];
  return <footer className="cue-footer">
    <div className="cue-footer-brand"><Link href="/" className="cue-wordmark">Cue<span aria-hidden="true">.</span></Link><p>{t.message}</p></div>
    <nav aria-label={locale === 'ja' ? 'フッター' : locale === 'en' ? 'Footer' : '页脚'}>{PATHS.map((path, index) => <Link key={path} href={`${path}?lang=${locale}`}>{t.links[index]}</Link>)}</nav>
    <small>© Cue Team. All rights reserved.</small>
  </footer>;
}
