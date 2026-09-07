import Image from 'next/image';
import Link from 'next/link';
import { Locale } from '../types';
import LatexRenderer from './LatexRenderer';

const COPY = {
  ja: { lines: ['その「なぜ？」が、', '世界を広げる。'], body: '科学も、ことばも、論理も。気になるクイズで、考えることを楽しもう。', start: '気になる1問に挑戦', explore: 'クイズを探す', featured: '今日の好奇心に' },
  en: { lines: ['Follow your curiosity.', 'Find a new perspective.'], body: 'Science, language, logic. Explore a question that makes you pause, think, and discover.', start: 'Try a question', explore: 'Explore quizzes', featured: 'Spark your curiosity' },
  zh: { lines: ['每一个“为什么”，', '都让世界更开阔。'], body: '科学、语言、逻辑。用一道感兴趣的题目，发现思考的乐趣。', start: '挑战一道题', explore: '探索测验', featured: '点燃今天的好奇心' },
};

export default function DiscoveryHero({ locale, quiz }: { locale: Locale; quiz?: { id: string; title: string; image: string } }) {
  const t = COPY[locale];
  return (
    <section className="cue-discovery" aria-labelledby="discovery-title">
      <div className="cue-discovery-copy">
        <h1 id="discovery-title" lang={locale === 'zh' ? 'zh-CN' : locale}>{t.lines.map(line => <span key={line}>{line}</span>)}</h1>
        <p>{t.body}</p>
        <div className="cue-discovery-actions">
          {quiz && <Link className="cue-primary" href={`/watch/${quiz.id}?lang=${locale}`}>{t.start}<span aria-hidden="true">↗</span></Link>}
          <a className="cue-text-link" href="#quiz-collection">{t.explore}<span aria-hidden="true">↓</span></a>
        </div>
      </div>
      {quiz && <Link href={`/watch/${quiz.id}?lang=${locale}`} className="cue-feature">
        <div className="cue-feature-image"><Image src={quiz.image} alt="" fill loading="eager" sizes="(max-width: 767px) 100vw, 42vw" className="object-cover" unoptimized={quiz.image.startsWith('data:')} /></div>
        <div className="cue-feature-caption"><span>{t.featured}</span><strong><LatexRenderer text={quiz.title} /></strong><span aria-hidden="true">↗</span></div>
      </Link>}
    </section>
  );
}
