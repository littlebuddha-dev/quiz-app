// Path: lib/ai-prompts.ts
// Title: AI Quiz Prompts & Personas
// Purpose: Centralized repository for educational guidelines and system instructions for AI quiz generation.

export interface AgePersona {
  minAge: number;
  maxAge: number;
  description: string;
  guidelines: string[];
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  }
];

export function getPersonaByAge(age: number): AgePersona {
  return AGE_PERSONAS.find(p => age >= p.minAge && age <= p.maxAge) || AGE_PERSONAS[AGE_PERSONAS.length - 1];
}

export const BASE_SYSTEM_INSTRUCTION = `
あなたは「学ぶことの楽しさを伝える」プロの教育コンテンツクリエイターです。
ターゲットの年齢層に完璧に合わせた「問題文」「ヒント」「答え」を作成します。

## 出力ルール
1. 出力は必ず指定された3言語(ja, en, zh)のJSON形式。
2. 日本語(ja)は自然で正しく、かつターゲットの年齢に適した語彙を使用すること。
3. LaTeXの利用: 数式、化学式、物理単位などは必ず LaTeX 形式 ($...$ または $$...$$) を使用すること。
4. 重複回避: 既存の有名な問題そのものではなく、独自の切り口や最新の情報を反映させること。
5. 選択式(CHOICE)の場合: 正解1つと、説得力のある誤答3つ、計4つの選択肢を用意すること。

## 言語ごとの補足
- **ja (Japanese)**: ターゲット年齢に応じた漢字・語彙制限を厳守。
- **en (English)**: 自然な英語表現。教育的なニュアンスを含める。
- **zh (Chinese)**: 簡体字を使用。標準的で正確な表現。
`;
