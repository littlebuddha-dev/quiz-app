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
      "将来の進路や時事問題に関連するテーマを扱う",
      "16歳前後では、難関オリンピック級よりも高校基礎から標準応用で3ステップ以内に解ける問題を優先する"
    ],
    imageStyle: "少し大人っぽく、落ち着いたアカデミックなイラスト。科学教材や上質な教育図解のような精密で分かりやすい表現。スタイリッシュで洗練されたデジタルアート風。",
    titleRules: [
      "タイトルは知的好奇心を刺激するが、幼すぎる表現は避ける",
    ],
    questionRules: [
      "問題文は前提条件を明確にし、考察要素を含める",
      "教科横断や実社会との接点がある問いを優先する",
      "16歳前後では、必要以上に抽象的な設定や過度に複雑な補助図形を避ける",
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

export const EDUCATIONAL_DATA: Record<string, { ageRange: string, content: Record<string, string> }> = {
  "小学校": {
    "ageRange": "6歳〜12歳",
    "content": {
      "国語": "漢字の読み書き、古典の世界に親しむこと、ローマ字、読書を通した情報の扱い方、話の構成を考える能力を学びます。",
      "社会": "身近な地域や市区町村の様子、47都道府県の名称と位置、我が国の歴史上の主な事象、グローバル化する世界と日本の役割、憲法の基本原則などを学びます。",
      "算数": "分数の計算（加法や減法）、小数の計算、図形の面積や体積の求め方、データの活用（グラフの読解）、プログラミング的思考の基礎を学びます。",
      "理科": "空気と水の性質、燃焼の仕組み、物の溶け方、振り子の運動、電流の働き、月や星、気象現象、生物の観察（プログラミング活用を含む）を学びます。",
      "生活": "身近な動植物への親しみ、四季の変化、遊びの工夫、公共施設の利用、自分自身の成長への気づきを学びます。",
      "音楽": "我が国の伝統的な音楽を含む歌唱、器楽、音楽づくり、鑑賞、記譜法の基礎などを学びます。",
      "図画工作": "絵や立体、工作に表す活動、身近な作品の鑑賞、材料や用具の取り扱いを学びます。",
      "家庭": "米飯及びみそ汁の調理、衣服の着用と手入れ、快適な住まい方、金銭の管理、消費者の役割を学びます。",
      "体育": "体つくり運動、器械運動、水泳、ボール運動のほか、健康な生活や体の発育・発達、安全の確保について学びます。",
      "外国語活動・外国語": "3・4年次は音声中心の活動、5・6年次は「教科」として読み書きを含むコミュニケーションの基礎を学びます。",
      "道徳": "善悪の判断、生命の尊さ、規則の尊重、伝統と文化の継承、多角的な視点での対話を学びます。",
      "総合的な学習の時間": "国際理解、情報、環境、福祉・健康、キャリア教育などの現代的な諸課題の探究を行います。",
      "特別活動": "学級活動、児童会活動、クラブ活動、学校行事を通した集団形成と自己実現を学びます。"
    }
  },
  "中学校": {
    "ageRange": "12歳〜15歳",
    "content": {
      "国語": "話すこと・聞くこと、書くこと、読むことに加え、古典（文語のきまり、漢文の訓読など）、情報の信頼性の吟味を学びます。",
      "社会": "地理的分野（世界の地域構成）、歴史的分野（古代文明から近現代まで）、公民的分野（日本国憲法、民主政治、市場経済、持続可能な社会）を学びます。",
      "数学": "正の数・負の数、方程式、一次関数、関数y=ax^2、図形の相似、三平方の定理、確率、標本の特性とデータの傾向を学びます。",
      "理科": "光と音、力の働き、化学変化と物質の質量、水溶液とイオン、生物の細胞と遺伝、気象、自然災害と科学技術を学びます。",
      "音楽": "伝統的な歌唱や和楽器（琴・太鼓等）の演奏、創作、世界の多様な音楽の鑑賞を学びます。",
      "美術": "絵画、彫刻、デザイン、映像メディア表現などの実践と、美術作品の背景を含めた鑑賞を学びます。",
      "保健体育": "各種スポーツ（武道、ダンス等を含む）の実践と、心身の相関、傷害の防止、健康な生活習慣を学びます。",
      "技術・家庭": "材料と加工、生物育成、エネルギー変換、情報の技術（計測・制御、双方向性のあるコンテンツ制作）や、自立した生活力を学びます。",
      "外国語": "日常的な話題から社会的な話題まで、英語での5領域（聞く・読む・話す[やり取り・発表]・書く）を学びます。",
      "道徳": "自主・自律、法やきまりの意義、生命の尊さ、社会貢献、国際親善などを考え、自己の生き方を深めます。",
      "総合的な学習の時間": "地域や社会との関わりの中で、自ら課題を見つけ解決する探究プロセスを学びます。",
      "特別活動": "学級活動（キャリア形成）、生徒会活動、学校行事などを通して、よりよい集団生活を築く態度を養います。"
    }
  },
  "高等学校": {
    "ageRange": "15歳〜18歳",
    "content": {
      "国語": "「現代の国語」「言語文化」を共通必履修とし、「論理国語」「文学国語」「古典探究」等で高度な思考力を養います。",
      "地理歴史": "「地理総合」「歴史総合」が必履修。近現代史を軸にグローバルな視点で事象の背景と繋がりを学びます。",
      "公民": "「公共」を必履修とし、自立した主体として社会に参画するための権利・義務や、倫理、政治・経済の諸課題を学びます。",
      "数学": "「数学Ⅰ〜Ⅲ」「数学A〜C」を通じ、二次関数、微分・積分、ベクトル、複素数、データの分析、数学的モデリングを学びます。",
      "理科": "物理、化学、生物、地学の「基礎」および発展科目を学び、科学的な探究方法と自然界の規則性を深く理解します。",
      "保健体育": "生涯スポーツへの親しみ、保健（精神保健、感染症、薬物乱用防止、生涯の健康）について専門的に学びます。",
      "芸術": "音楽、美術、工芸、書道から選択し、創造的な表現と創造的思考、文化の継承を学びます。",
      "外国語": "「英語コミュニケーションⅠ〜Ⅲ」「論理・表現Ⅰ〜Ⅲ」を通し、ディベートやプレゼンテーションを含む高度な発信力を学びます。",
      "家庭": "「家庭基礎」等で、家族・家庭の変容、共生社会の創出、消費者の権利、ライフプランニングを学びます。",
      "情報": "「情報Ⅰ」を必履修とし、情報デザイン、プログラミング、ネットワークと強固なセキュリティ、データサイエンス（統計）を学びます。",
      "理数": "「理数探究基礎」「理数探究」を通して、自ら設定した問いに対して科学的根拠に基づいた検証を行う活動を学びます。",
      "総合的な探究の時間": "自己の在り方生き方と一体的な課題解決を通じ、未知の状況にも対応できる資質・能力を育みます。",
      "特別活動": "ホームルーム活動での進路指導、生徒会活動を通じた学校運営への参画、学校行事の企画・運営を学びます。"
    }
  }
};

export function buildEducationalContextPrompt(age: number, categoryNames: Array<string | null | undefined>, guidelines?: any) {
  if (age > 18 || age < 6) return '';

  let group = "";
  if (age >= 6 && age <= 12) group = "小学校";
  else if (age > 12 && age <= 15) group = "中学校";
  else if (age > 15 && age <= 18) group = "高等学校";

  if (!group) return '';

  const data = (guidelines && guidelines[group]) ? guidelines[group] : EDUCATIONAL_DATA[group];
  const normalizedCategoryNames = categoryNames
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map(v => v.toLowerCase().replace(/\s+/g, ''));

  // ジャンルに合致する科目の内容を探す
  let matchedContent = "";
  const contentMap = data.content || {};
  for (const [subject, content] of Object.entries(contentMap)) {
    if (normalizedCategoryNames.some(cat => subject.toLowerCase().includes(cat) || cat.includes(subject.toLowerCase()))) {
      matchedContent += `- ${subject}: ${content}\n`;
    }
  }

  // 合致するものがなければ、その学年層の主要な教育内容を提示
  if (!matchedContent) {
    matchedContent = Object.entries(contentMap)
      .slice(0, 5) // 代表的な5件
      .map(([subject, content]) => `- ${subject}: ${content}`)
      .join('\n');
  }

  return `

## ${group}教育課程の背景知識 (参考)
この年齢層の学習者は、学校で以下のような内容を学んでいます。これらを参考に、知識の定着を助けたり、興味を広げたりする問題を設計してください。
${matchedContent}
`;
}
