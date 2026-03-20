// Path: lib/ai-prompts.ts
// Title: AI Quiz Prompts & Personas
// Purpose: Centralized repository for educational guidelines and system instructions for AI quiz generation.

export interface AgePersona {
  minAge: number;
  maxAge: number;
  description: string;
  guidelines: string[];
  imageStyle: string;
  titleRules: string[];
  questionRules: string[];
  hintRules: string[];
  explanationRules: string[];
  optionRules: string[];
  topicHooks: string[];
}

export type QuizLocaleCode = 'ja' | 'en' | 'zh';

type LanguageSubjectRule = {
  subjectLocale: QuizLocaleCode;
  aliases: string[];
  subjectNames: Record<QuizLocaleCode, string>;
};

export const QUIZ_OUTPUT_LOCALES: QuizLocaleCode[] = ['ja', 'en', 'zh'];

const LANGUAGE_SUBJECT_RULES: LanguageSubjectRule[] = [
  {
    subjectLocale: 'ja',
    aliases: ['国語', '日本語', 'japanese', 'japanese language', 'japanese subject'],
    subjectNames: {
      ja: '日本語',
      en: 'Japanese',
      zh: '日语',
    },
  },
  {
    subjectLocale: 'en',
    aliases: ['英語', 'english', 'english language', 'english subject'],
    subjectNames: {
      ja: '英語',
      en: 'English',
      zh: '英语',
    },
  },
  {
    subjectLocale: 'zh',
    aliases: ['中国語', '中文', '汉语', '華語', 'chinese', 'chinese language', 'mandarin'],
    subjectNames: {
      ja: '中国語',
      en: 'Chinese',
      zh: '中文',
    },
  },
];

function normalizeCategoryAlias(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').trim();
}

export function detectLanguageSubjectRule(categoryNames: Array<string | null | undefined>) {
  const normalizedNames = categoryNames
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .map(normalizeCategoryAlias);

  return LANGUAGE_SUBJECT_RULES.find((rule) =>
    rule.aliases.some((alias) => normalizedNames.includes(normalizeCategoryAlias(alias)))
  ) || null;
}

export function buildLanguageSubjectPromptBlock(categoryNames: Array<string | null | undefined>) {
  const rule = detectLanguageSubjectRule(categoryNames);
  if (!rule) {
    return '';
  }

  const localeDescriptions = QUIZ_OUTPUT_LOCALES
    .map((locale) => `- ${locale}: 説明・ヒント・設問の指示文は ${locale} の自然な言語で書く`)
    .join('\n');

  return `

## 言語学習ジャンルの特別指示
- このジャンルは「${rule.subjectNames.ja}」を学ぶ問題です。問題の核となる例文・会話文・単語列・空欄文は、必ず ${rule.subjectNames.ja} のまま作成してください。
- ja / en / zh の question では、先頭に同一の「学習対象テキスト」を置き、その学習対象テキスト自体は翻訳しないでください。
- question は「学習対象テキスト」+「そのロケール向けの指示文」という構造にしてください。
- hint と explanation は各ロケールの自然な言語でローカライズしてください。ただし、学習対象テキスト中の単語や例文は必要な部分だけ原文のまま引用して構いません。
- answer は学習対象テキストを解くための正答なので、ja / en / zh すべてで同じ ${rule.subjectNames.ja} の語句にしてください。翻訳しないでください。
- CHOICE の options も問題そのものの一部なので、ja / en / zh すべてで同じ ${rule.subjectNames.ja} の選択肢にしてください。翻訳しないでください。
- 学習対象テキストは各ロケールで完全に一致する必要があります。引用符や括弧を含め、表記を変えないでください。
- 将来ロケールが増えてもルールは同じです。新しいロケールでは、学習対象テキストと answer/options は ${rule.subjectNames.ja} のまま維持し、周辺の指示・ヒント・解説だけをそのロケールの言語にしてください。

### ロケール別の周辺文ルール
${localeDescriptions}
`;
}

export const AGE_PERSONAS: AgePersona[] = [
  {
    minAge: 0,
    maxAge: 3,
    description: "乳幼児 (0-3歳): 直感的で視覚的な学習フェーズ",
    guidelines: [
      "言葉は極めてシンプルにする（「これなあに？」「どうぶつさん」など）",
      "オノマトペ（擬音語・擬態語）を積極的に使用する",
      "色、形、身近な動物、食べ物をテーマにする",
      "正解は1つで、ひっかけは作らない",
      "「お母さん/お父さんと一緒に楽しむ」雰囲気を作る"
    ],
    imageStyle: "非常に優しく、丸みのある、かわいらしい絵本のようなイラスト。明るく鮮やかな色彩、ポップで賑やかなデザイン。日本のアニメ調や、ピクサーのような温かみのある3Dキャラクター風のスタイル。",
    titleRules: [
      "タイトルは短く、呼びかけ型にする",
      "ひらがな中心で5〜12文字程度に収める",
    ],
    questionRules: [
      "問題文は1〜2文までにする",
      "見た目や名前を当てる直感問題を優先する",
    ],
    hintRules: [
      "ヒントは答えを半分近く教えるくらい親切にする",
    ],
    explanationRules: [
      "解説は『これは〜だよ』のように短く安心感のある言い方にする",
    ],
    optionRules: [
      "選択肢は視覚的に区別しやすい語だけにする",
      "誤答は難しすぎず、紛らわしすぎないものにする",
    ],
    topicHooks: ["どうぶつ", "のりもの", "たべもの", "いろ", "かたち", "おと"],
  },
  {
    minAge: 4,
    maxAge: 6,
    description: "未就学児 (4-6歳): 好奇心と基礎的な概念理解フェーズ",
    guidelines: [
      "ひらがな・カタカナを基本とする（漢字は使わないか、極めて簡単なもののみ）",
      "数の数え方、反対言葉、マナー、自然（花や虫）をテーマにする",
      "具体的なイメージが湧きやすい比較（「どっちが大きい？」など）を使う",
      "「すごいね！」「正解だよ！」という励ましを意識したトーンにする"
    ],
    imageStyle: "親しみやすく、かわいいイラスト。適度にデフォルメされた、明るい色使い。温かみのある手書きの挿絵風や、子供向けアニメーション風のスタイル。",
    titleRules: [
      "タイトルはワクワク感のある一言にする",
      "ひらがな中心で、必要なら簡単なカタカナを使う",
    ],
    questionRules: [
      "問題文は2〜3文以内にする",
      "数える・くらべる・えらぶのどれかがすぐ分かる問いにする",
    ],
    hintRules: [
      "ヒントは『どっちかな？』『よくみてみよう』のような背中押し型にする",
    ],
    explanationRules: [
      "解説は短く、褒め言葉を1つ添える",
    ],
    optionRules: [
      "選択肢は言葉の長さをそろえ、幼児でも読みやすくする",
    ],
    topicHooks: ["かず", "あいさつ", "きせつ", "むし", "はな", "せいかつ"],
  },
  {
    minAge: 7,
    maxAge: 12,
    description: "小学生 (7-12歳): 教科の基礎と論理的思考の芽生えフェーズ",
    guidelines: [
      "学年に応じた漢字を使用し、必要に応じて難読漢字には読みを想定する",
      "国語、算数、理科、社会の基礎知識を問う",
      "「なぜ？」「どうして？」を刺激する、トリビア的な要素を含める",
      "論理的に考えれば解ける、ステップのある問題を作成する",
      "日常生活に関連する科学や歴史のエピソードを好む"
    ],
    imageStyle: "教育雑誌の挿絵風や、現代的なアニメ・マンガ調。説明的で理解を助ける明確な表現。ワクワクするような冒険心を感じさせるポップなイラスト。",
    titleRules: [
      "タイトルは『えっ本当？』『なぜ？』と思わせる見出しにする",
      "小学生が声に出して読みたくなるテンポ感を出す",
    ],
    questionRules: [
      "問題文は3〜5文を目安に、背景と問いを分けて書く",
      "すぐ暗記を問うだけでなく、少し考えれば解ける構成にする",
    ],
    hintRules: [
      "ヒントは答えを直接言わず、考える順番を示す",
    ],
    explanationRules: [
      "解説では『なぜそうなるか』を一段深く説明する",
      "豆知識や身近な例を1つ入れる",
    ],
    optionRules: [
      "誤答にももっともらしい理由を持たせる",
      "消去法だけでなく理解で選べる選択肢にする",
    ],
    topicHooks: ["ふしぎ", "実験", "歴史の意外", "ことばのひみつ", "生活の中の算数", "論理パズル"],
  },
  {
    minAge: 13,
    maxAge: 18,
    description: "中高生 (13-18歳): 専門教育の導入と抽象概念の理解フェーズ",
    guidelines: [
      "教科書レベルの専門用語を正確に使用する",
      "数式には必ず LaTeX 形式を使用する ($x^2$, $\\sqrt{a}$ など)",
      "複数の知識を組み合わせないと解けない、応用問題を作成する",
      "客観的なデータや史実に基づいた解説を重視する",
      "将来の進路や時事問題に関連するテーマを扱う"
    ],
    imageStyle: "少し大人っぽく、落ち着いたアカデミックなイラスト。学術書や、雑誌『NEWTON』のような科学的で精密な図解・表現。スタイリッシュで洗練されたデジタルアート風。",
    titleRules: [
      "タイトルは知的好奇心を刺激するが、幼すぎる表現は避ける",
    ],
    questionRules: [
      "問題文は前提条件を明確にし、考察要素を含める",
      "教科横断や実社会との接点がある問いを優先する",
    ],
    hintRules: [
      "ヒントは解法の入口や着眼点を示す",
    ],
    explanationRules: [
      "解説は根拠・考え方・誤答が誤りな理由まで触れる",
    ],
    optionRules: [
      "選択肢は教科書知識を曖昧に覚えていると迷う水準にする",
    ],
    topicHooks: ["入試につながる視点", "時事", "科学技術", "データ読解", "複合思考", "社会課題"],
  },
  {
    minAge: 19,
    maxAge: 99,
    description: "大学生・大学院生・一般 (19歳以上): 高度な専門性と学際的理解フェーズ",
    guidelines: [
      "論文や専門書レベルの用語、最新の研究トピックを扱う",
      "学術的な厳密さを追求し、曖昧な表現を避ける",
      "ケーススタディや理論の適用、高度な数学的証明などをテーマにする",
      "解説には背景にある理論や学派、出典などを盛り込む",
      "知的な満足感を与える、深みのある問いを作成する"
    ],
    imageStyle: "フォトリアル、または学問的で厳格なプロフェッショナルな表現。抽象的で知的なデザイン。洗練されたミニマリズムや、詳細な技術的イラスト。",
    titleRules: [
      "タイトルは専門性と意外性のバランスを取る",
    ],
    questionRules: [
      "問題文は前提・条件・問いを構造化する",
      "実務や研究での応用可能性が感じられる題材にする",
    ],
    hintRules: [
      "ヒントは論点整理や比較軸の提示に留める",
    ],
    explanationRules: [
      "解説は短くても理論背景と実践的含意を含める",
    ],
    optionRules: [
      "選択肢は専門知識の浅い丸暗記では見抜けないようにする",
    ],
    topicHooks: ["研究トレンド", "実務判断", "ケーススタディ", "理論応用", "批判的思考", "学際テーマ"],
  }
];

export function getPersonaByAge(age: number): AgePersona {
  return AGE_PERSONAS.find(p => age >= p.minAge && age <= p.maxAge) || AGE_PERSONAS[AGE_PERSONAS.length - 1];
}

export const BASE_SYSTEM_INSTRUCTION = `
あなたは「学ぶことの楽しさを伝える」プロの教育コンテンツクリエイターです。
ターゲットの年齢層に完璧に合わせた「問題文」「ヒント」「答え」を作成します。

## 出力ルール
1. 出力は必ず指定された3言語(ja, en, zh)のJSON形式。各言語のオブジェクトには 'type' ('TEXT' か 'CHOICE'), 'title' (画像用見出し), 'question' (詳細な問題文), 'hint' (ヒント), 'answer' (解答), 'explanation' (解説) を含め、選択式(CHOICE)の場合はさらに 'options' (選択肢の配列) を含めること。
2. 自動形式変更: リクエストが記述式(TEXT)であっても、答えが複雑な数式（LaTeXなど）になる場合や、10文字以上の長い文字列になる場合は、回答のしやすさを考慮して自動的に選択式(CHOICE)として出力し、適切に4つの選択肢を作成すること。
3. 日本語(ja)は自然で正しく、かつターゲットの年齢に適した語彙を使用すること。
4. LaTeXの利用: 数式、化学式、物理単位などは必ず LaTeX 形式 ($...$ または $$...$$) を使用すること。JSON内ではバックスラッシュを必ず二重（\\\\）にエスケープしてください。
5. 重複回避: 既存の有名な問題そのものではなく、独自の切り口や最新の情報を反映させること。
6. 選択式(CHOICE)の場合: 正解1つと、説得力のある誤答3つ、計4つの選択肢を 'options' に用意すること。正解は 'answer' と完全一致させること。
6-1. 選択式(CHOICE)の answer は、できるだけ短い語句に圧縮すること。長い説明文ではなく、核となる結論だけを簡潔に表現すること。
7. 日本語の科学表記: ja では times やプレーンテキストの数式英単語を使わず、通常文では × や 10^n、必要に応じて LaTeX ($6.0 \\times 10^{23}$) を使うこと。
8. 計算問題の誤答設計: CHOICE で数値が答えになる場合、誤答は「指数の足し引きミス」「有効数字の取り違え」「単位換算ミス」など、学習者が実際にしがちな誤りを反映させること。
9. 場所指定がある場合: テーマや追加指示に地名・都道府県名・国名・地域名が含まれる場合は、その場所を必ず問題の中心に据えること。別地域へ話題を逸らさないこと。
10. 問題の焦点: 1問につき論点は1つに絞ること。背景説明を長くしすぎず、何を答えればよいかが一読で分かるようにすること。
11. 記述式(TEXT)の答え: 日本語の answer は、原則として短い語句または簡潔な1フレーズにすること。長い文章説明が必要なら CHOICE に切り替えること。
12. タイトルの簡潔さ: title は長すぎる説明文ではなく、内容が伝わる短い見出しにすること。
13. タイトルの具体性: 問題本文に固有名詞（地名・人名・建築名・遺跡名・物質名など）がある場合、title にも少なくとも1つ具体名を入れること。抽象語だけの見出しは禁止。
14. 場所テーマの現地性: 地名や名所が主題のときは、歴史だけで閉じず、その土地で今も感じられる価値・景観・文化のどれかに自然につながる視点を含めること。
## 言語ごとの補足
- **ja (Japanese)**: ターゲット年齢に応じた漢字・語彙制限を厳守。
- **en (English)**: 自然な英語表現。教育的なニュアンスを含める。
- **zh (Chinese)**: 簡体字を使用。標準的で正確な表現。
`;

export function buildAgePromptBlock(age: number) {
  const persona = getPersonaByAge(age);
  return `
## 対象年齢 (${age}歳) 向け特別指示 [${persona.description}]
### 基本ガイド
${persona.guidelines.map((g) => `- ${g}`).join('\n')}

### タイトル設計
${persona.titleRules.map((g) => `- ${g}`).join('\n')}

### 問題文設計
${persona.questionRules.map((g) => `- ${g}`).join('\n')}

### ヒント設計
${persona.hintRules.map((g) => `- ${g}`).join('\n')}

### 解説設計
${persona.explanationRules.map((g) => `- ${g}`).join('\n')}

### 選択肢設計
${persona.optionRules.map((g) => `- ${g}`).join('\n')}

### 数式・数値表記
- ja では times を文字列として出さず、通常文では ×、数式では LaTeX を使う。
- 科学記数法を使う場合は、桁や指数がひと目で分かるように表記する。
`;
}

export function buildTopicPlannerPrompt(age: number, categoryName: string, count: number, existingTitles: string[]) {
  const persona = getPersonaByAge(age);
  return `
あなたは教育プランナーです。「${categoryName}」というジャンルで、${age}歳 (${persona.description}) 向けに、新しく面白いクイズのトピックを ${count} 個提案してください。

## この年齢で刺さりやすい切り口
${persona.topicHooks.map((hook) => `- ${hook}`).join('\n')}

## 既存のトピック (これらは避けてください)
${existingTitles.length > 0 ? existingTitles.slice(0, 50).join(', ') : 'なし'}

## 制約
- 各トピックは具体的で、1つのクイズとして成立するものにしてください。
- 年齢に対して難しすぎる抽象概念や退屈な言い回しは避けてください。
- 同じ知識の言い換えではなく、驚き・発見・考える楽しさのどれかが入るものを優先してください。
- 「${categoryName}」らしさが一目で伝わるトピックにしてください。
- 地名指定がある場合は、その土地の歴史・地理・風土のいずれかに必ず着地するトピックにしてください。
- 出力はJSON形式で、キー "topics" に文字列の配列を入れてください。
`;
}
