/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/quiz-generator/route.ts
export const runtime = 'edge';
// Title: Quiz Generator API Route
// Purpose: Generates quiz text and illustration using Google Gen AI based on topic, category, age, and type.

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  buildAgePromptBlock,
  buildLanguageSubjectPromptBlock,
  detectLanguageSubjectRule,
  getPersonaByAge,
  BASE_SYSTEM_INSTRUCTION,
} from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

type MultiLangQuiz = {
  ja: {
    title?: string;
    question?: string;
    hint?: string;
    answer?: string;
    explanation?: string | null;
    type?: 'TEXT' | 'CHOICE';
    options?: string[] | string | null;
  };
  en: Record<string, unknown>;
  zh: Record<string, unknown>;
};

type CategoryQualityRule = {
  focusKeywords: string[];
  avoidKeywords: string[];
};

type CategorySummary = {
  systemPrompt: string | null;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameZh: string | null;
};

type LocaleQuizEntry = {
  title?: string;
  question?: string;
  hint?: string;
  answer?: string;
  explanation?: string | null;
  type?: 'TEXT' | 'CHOICE';
  options?: string[] | string | null;
};

function normalizeChoiceOptions(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return normalizeChoiceOptions(JSON.parse(value));
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return undefined;
}

function normalizeJapaneseScientificNotation(value: string) {
  return value
    .replace(/\btimes\b/gi, '×')
    .replace(/\\text\{times\}/gi, '×')
    .replace(/(\d(?:\.\d+)?)\s*×\s*10\^(\d+)/g, '$1 × 10^{$2}')
    .replace(/(\d(?:\.\d+)?)\s*x\s*10\^(\d+)/gi, '$1 × 10^{$2}');
}

function normalizeJapaneseQuizFields(quiz: MultiLangQuiz) {
  if (!quiz || typeof quiz !== 'object' || !quiz.ja || typeof quiz.ja !== 'object') {
    return quiz;
  }

  const ja = quiz.ja;
  const normalizedOptions = normalizeChoiceOptions(ja.options)?.map(normalizeJapaneseScientificNotation);

  return {
    ...quiz,
    ja: {
      ...ja,
      title: normalizeJapaneseScientificNotation(normalizeText(ja.title)),
      question: normalizeJapaneseScientificNotation(normalizeText(ja.question)),
      hint: normalizeJapaneseScientificNotation(normalizeText(ja.hint)),
      answer: normalizeJapaneseScientificNotation(normalizeText(ja.answer)),
      explanation: ja.explanation ? normalizeJapaneseScientificNotation(ja.explanation) : ja.explanation,
      options: normalizedOptions,
    },
  };
}

const CATEGORY_QUALITY_RULES: Record<string, CategoryQualityRule> = {
  '化学': {
    focusKeywords: ['原子', '分子', '電子', '元素', '化学', '反応', '結合', '酸', '塩基', 'イオン', 'mol', '周期表'],
    avoidKeywords: ['ダークマター', 'ブラックホール', '銀河', '宇宙膨張', '惑星軌道'],
  },
  '物理': {
    focusKeywords: ['力', '運動', 'エネルギー', '電流', '電圧', '磁場', '波', '光', '速度', '加速度'],
    avoidKeywords: ['文法', '古文', '品詞'],
  },
  '数学': {
    focusKeywords: ['方程式', '関数', '図形', '確率', '整数', '角度', '面積', '体積', '比例', '微分', '積分'],
    avoidKeywords: ['細胞', '遺伝子', '年号'],
  },
  '理科': {
    focusKeywords: ['観察', '実験', '現象', 'エネルギー', '生物', '地層', '天気', '植物', '光', '音'],
    avoidKeywords: ['古典文法', '英作文'],
  },
};

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractPlaceHints(...values: Array<string | undefined>) {
  const joined = values.filter(Boolean).join(' ');
  const matches = joined.match(/[一-龠ぁ-んァ-ヶーA-Za-z0-9]+(?:都|道|府|県|市|区|町|村|国|地方|半島|湾|平野|盆地|山地|川|湖)/g);
  return Array.from(new Set(matches || []));
}

function extractConcreteAnchorTerms(text: string) {
  const matches = text.match(/[一-龠ぁ-んァ-ヶーA-Za-z0-9]{2,}(?:寺|神社|城|氏|遺跡|古墳|遺産|平泉|清衡|義経|頼朝|秀吉|信長|家康)/g);
  return Array.from(new Set(matches || []));
}

function normalizeComparisonText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractExerciseText(question: string) {
  const trimmed = question.trim();
  const quotedAnywhere = trimmed.match(/[「『“"][\s\S]+?[」』”"]/);
  if (quotedAnywhere?.[0]) {
    return normalizeComparisonText(quotedAnywhere[0]);
  }

  const leadingQuoted = trimmed.match(/^([「『“"][\s\S]+?[」』”"])/);
  if (leadingQuoted?.[1]) {
    return normalizeComparisonText(leadingQuoted[1]);
  }

  const firstLine = trimmed.split('\n')[0]?.trim();
  if (firstLine) {
    const colonSeparated = firstLine.match(/^[^:：]+[:：]\s*(.+)$/);
    if (colonSeparated?.[1]) {
      return normalizeComparisonText(colonSeparated[1]);
    }
  }

  if (firstLine && firstLine.length <= 160) {
    return normalizeComparisonText(firstLine);
  }

  return '';
}

function replaceExerciseText(question: string, nextExerciseText: string) {
  const trimmed = question.trim();
  if (!trimmed || !nextExerciseText) {
    return question;
  }

  const quotedAnywhere = trimmed.match(/[「『“"][\s\S]+?[」』”"]/);
  if (quotedAnywhere?.[0]) {
    return question.replace(quotedAnywhere[0], nextExerciseText);
  }

  const lines = question.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0];
    const colonSeparated = firstLine.match(/^([^:：]+[:：]\s*)(.+)$/);
    if (colonSeparated) {
      lines[0] = `${colonSeparated[1]}${nextExerciseText}`;
      return lines.join('\n');
    }
    if (firstLine.trim().length <= 160) {
      lines[0] = nextExerciseText;
      return lines.join('\n');
    }
  }

  return question;
}

function normalizeLanguageSubjectQuizFields(quiz: MultiLangQuiz) {
  if (!quiz || typeof quiz !== 'object' || !quiz.ja || typeof quiz.ja !== 'object') {
    return quiz;
  }

  const sharedAnswer = normalizeText(quiz.ja.answer);
  const sharedOptions = normalizeChoiceOptions(quiz.ja.options);
  const sharedExerciseText = extractExerciseText(normalizeText(quiz.ja.question));
  const enQuestion = normalizeText(String(quiz.en.question || ''));
  const zhQuestion = normalizeText(String(quiz.zh.question || ''));

  return {
    ...quiz,
    en: {
      ...quiz.en,
      question: sharedExerciseText ? replaceExerciseText(enQuestion, sharedExerciseText) : quiz.en.question,
      answer: sharedAnswer || quiz.en.answer,
      options: sharedOptions || quiz.en.options,
    },
    zh: {
      ...quiz.zh,
      question: sharedExerciseText ? replaceExerciseText(zhQuestion, sharedExerciseText) : quiz.zh.question,
      answer: sharedAnswer || quiz.zh.answer,
      options: sharedOptions || quiz.zh.options,
    },
  };
}

function inferLocaleFromEntry(entry: LocaleQuizEntry) {
  const text = [
    entry.title,
    entry.question,
    entry.hint,
    entry.answer,
    entry.explanation || '',
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .join(' ');

  if (/[ぁ-んァ-ヶ]/.test(text)) {
    return 'ja' as const;
  }

  const englishScore = [
    /\bthe\b/i,
    /\bchoose\b/i,
    /\bfill in\b/i,
    /\bmost appropriate\b/i,
    /\bplease\b/i,
    /\bblank\b/i,
  ].reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);

  if (englishScore > 0) {
    return 'en' as const;
  }

  return 'zh' as const;
}

function coerceMultiLangQuizResponse(value: unknown): MultiLangQuiz | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (!Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    if (candidate.ja && candidate.en && candidate.zh) {
      return candidate as unknown as MultiLangQuiz;
    }

    for (const nestedValue of Object.values(candidate)) {
      const nested = coerceMultiLangQuizResponse(nestedValue);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  const localeEntries = value.filter(
    (entry): entry is LocaleQuizEntry =>
      !!entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).question === 'string'
  );

  if (localeEntries.length < 3) {
    return null;
  }

  const result: Partial<Record<'ja' | 'en' | 'zh', LocaleQuizEntry>> = {};
  for (const entry of localeEntries) {
    const locale = inferLocaleFromEntry(entry);
    if (!result[locale]) {
      result[locale] = entry;
    }
  }

  const fallbackOrder: Array<'ja' | 'en' | 'zh'> = ['ja', 'en', 'zh'];
  let fallbackIndex = 0;
  for (const entry of localeEntries) {
    while (fallbackIndex < fallbackOrder.length && result[fallbackOrder[fallbackIndex]]) {
      fallbackIndex += 1;
    }
    if (fallbackIndex >= fallbackOrder.length) {
      break;
    }
    const locale = fallbackOrder[fallbackIndex];
    if (!result[locale]) {
      result[locale] = entry;
    }
  }

  if (!result.ja || !result.en || !result.zh) {
    return null;
  }

  return {
    ja: result.ja,
    en: result.en,
    zh: result.zh,
  } as MultiLangQuiz;
}

function buildQualityFeedback(params: {
  quiz: MultiLangQuiz;
  age: number;
  categoryName: string;
  categoryNames: Array<string | null | undefined>;
  requestedQuizType: 'TEXT' | 'CHOICE';
  topic?: string;
  correctionPrompt?: string;
}) {
  const { quiz, age, categoryName, categoryNames, requestedQuizType, topic, correctionPrompt } = params;
  const issues: string[] = [];
  const ja = quiz.ja;
  const combined = [ja.title, ja.question, ja.hint, ja.answer, ja.explanation].map(normalizeText).join('\n');
  const languageSubjectRule = detectLanguageSubjectRule(categoryNames);

  if (!normalizeText(ja.title) || !normalizeText(ja.question) || !normalizeText(ja.hint) || !normalizeText(ja.answer)) {
    issues.push('日本語の title/question/hint/answer のいずれかが不足しています。');
  }

  if (normalizeText(ja.title).length > 32) {
    issues.push('title が長すぎます。内容が伝わる短い見出しへ圧縮してください。');
  }

  if (age <= 6 && normalizeText(ja.question).length > 140) {
    issues.push('未就学児向けとして問題文が長すぎます。もっと短く具体的にしてください。');
  }

  if (age >= 13 && normalizeText(ja.question).length > 220) {
    issues.push('中高生以上向けでも問題文が長すぎます。背景説明を削って、問いを1つに絞ってください。');
  }

  if (age >= 13 && normalizeText(ja.explanation).length < 50) {
    issues.push('中高生以上向けとして解説が浅すぎます。根拠や考え方を補ってください。');
  }

  if ((ja.type || requestedQuizType) === 'TEXT' && normalizeText(ja.answer).length > 28) {
    issues.push('記述式の answer が長すぎます。短い語句にするか、選択式へ切り替えてください。');
  }

  if ((ja.type || requestedQuizType) === 'CHOICE' && normalizeText(ja.answer).length > 26) {
    issues.push('選択式の answer が長すぎます。核となる結論だけを短い語句で表現してください。');
  }

  const titleText = normalizeText(ja.title);
  const questionText = normalizeText(ja.question);
  const anchorTerms = extractConcreteAnchorTerms(questionText);
  if (anchorTerms.length > 0 && !anchorTerms.some((term) => titleText.includes(term))) {
    issues.push(`title が抽象的です。本文に出てくる具体名 (${anchorTerms.slice(0, 3).join('、')}) のいずれかを title に入れてください。`);
  }

  if ((ja.type || requestedQuizType) === 'CHOICE') {
    const options = Array.isArray(ja.options)
      ? ja.options
      : typeof ja.options === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(ja.options);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];

    if (options.length !== 4) {
      issues.push('選択式なのに選択肢が4件ちょうどになっていません。');
    }
    if (options.length > 0 && !options.includes(normalizeText(ja.answer))) {
      issues.push('answer が options のいずれかと一致していません。');
    }
    const normalizedOptionSet = new Set(
      options.map((option) => normalizeText(normalizeJapaneseScientificNotation(option)))
    );
    if (options.length > 0 && normalizedOptionSet.size !== options.length) {
      issues.push('選択肢に重複があります。4つとも異なる内容にしてください。');
    }
  }

  if (languageSubjectRule) {
    const localeQuestions = {
      ja: normalizeText(quiz.ja.question),
      en: normalizeText(String(quiz.en.question || '')),
      zh: normalizeText(String(quiz.zh.question || '')),
    };
    const localeAnswers = {
      ja: normalizeText(quiz.ja.answer),
      en: normalizeText(String(quiz.en.answer || '')),
      zh: normalizeText(String(quiz.zh.answer || '')),
    };
    const localeExerciseTexts = Object.entries(localeQuestions).map(([locale, question]) => [locale, extractExerciseText(question)] as const);

    if (localeExerciseTexts.some(([, text]) => !text)) {
      issues.push('言語学習ジャンルでは、question の先頭に同一の学習対象テキストを明示してください。');
    } else {
      const uniqueExerciseTexts = new Set(localeExerciseTexts.map(([, text]) => text));
      if (uniqueExerciseTexts.size > 1) {
        issues.push(`言語学習ジャンルなのに、学習対象テキストがロケールごとに変化しています。${languageSubjectRule.subjectNames.ja}の原文部分は ja / en / zh で完全一致させてください。`);
      }
    }

    if (localeAnswers.ja && [localeAnswers.en, localeAnswers.zh].some((answer) => answer !== localeAnswers.ja)) {
      issues.push(`言語学習ジャンルでは answer は翻訳せず、${languageSubjectRule.subjectNames.ja}の正答を ja / en / zh で共通にしてください。`);
    }

    if ((ja.type || requestedQuizType) === 'CHOICE') {
      const localeOptions = {
        ja: normalizeChoiceOptions(quiz.ja.options) || [],
        en: normalizeChoiceOptions(quiz.en.options) || [],
        zh: normalizeChoiceOptions(quiz.zh.options) || [],
      };
      const jaOptionsSignature = localeOptions.ja.map(normalizeComparisonText).join('||');
      if (
        jaOptionsSignature &&
        [localeOptions.en, localeOptions.zh].some((options) => options.map(normalizeComparisonText).join('||') !== jaOptionsSignature)
      ) {
        issues.push(`言語学習ジャンルでは options も問題文の一部です。${languageSubjectRule.subjectNames.ja}の選択肢を ja / en / zh で共通にしてください。`);
      }
    }
  }

  const matchedRule = Object.entries(CATEGORY_QUALITY_RULES).find(([key]) => categoryName.includes(key));
  if (matchedRule) {
    const [, rule] = matchedRule;
    if (!rule.focusKeywords.some((keyword) => combined.includes(keyword))) {
      issues.push(`カテゴリ「${categoryName}」らしい語彙が不足しています。${rule.focusKeywords.slice(0, 5).join('、')} などを軸にしてください。`);
    }
    const badKeyword = rule.avoidKeywords.find((keyword) => combined.includes(keyword));
    if (badKeyword) {
      issues.push(`カテゴリ「${categoryName}」に対して不適切な題材 (${badKeyword}) が混入しています。カテゴリに忠実な問題へ修正してください。`);
    }
  }

  const placeHints = extractPlaceHints(topic, correctionPrompt);
  if (placeHints.length > 0 && !placeHints.some((place) => combined.includes(place))) {
    issues.push(`指定された場所 (${placeHints.join('、')}) が問題文や解説に十分反映されていません。場所を中心に据えてください。`);
  }

  return issues;
}

async function generateQuizPayload(params: {
  ai: GoogleGenAI;
  modelsToTry: string[];
  prompt: string;
  categoryName: string;
}) {
  const { ai, modelsToTry, prompt, categoryName } = params;
  let lastError: unknown;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptPrompt = attempt === 0
        ? prompt
        : `${prompt}

## 再生成の追加指示
- 前回の出力には品質上の問題がありました。カテゴリと年齢により厳密に合わせて作り直してください。
- 「${categoryName}」から逸脱する題材は使わないでください。
- 答え・解説は断定しすぎず、教育的に正確な表現にしてください。`;

      try {
        const response = await ai.models.generateContent({
          model,
          contents: attemptPrompt,
          config: { responseMimeType: 'application/json' },
        });

        return { response, model };
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.response?.status;
        const message = String(error?.message || '');
        const isQuotaError = status === 429 || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED');
        if (!isQuotaError) {
          throw error;
        }
        break;
      }
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  let selectedModel = DEFAULT_MODEL_ID;
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    await ensureCategoryLocalizationColumns(prisma as any);

    // Budget Check
    const budget = await checkApiBudget(prisma);
    if (budget.exceeded) {
      return NextResponse.json({ 
        error: 'BUDGET_EXCEEDED', 
        message: `月間のAPI制約額 ($${budget.limit}) に達しました。管理者にお問い合わせください。` 
      }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Skipping AI generation.");
      return NextResponse.json({ error: 'CONFIG_ERROR', message: 'APIキーが設定されていません。' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const body = (await req.json()) as any;
    const { topic, categoryId, targetAge, quizType, imageUrl: providedImageUrl, systemPrompt, correctionPrompt, excludeTitles, modelId } = body;

    const hybridModelId = modelId || DEFAULT_MODEL_ID;
    const hybridModel = getModelById(hybridModelId);
    // If modelId is already a raw Gemini model name (passed from auto-generator), use it. 
    // Otherwise use the generatorId from the hybrid config.
    selectedModel = (modelId && !modelId.startsWith('hybrid-')) ? modelId : hybridModel.generatorId;
    
    const parsedAge = parseInt(targetAge) || 8;
    const persona = getPersonaByAge(parsedAge);

    // カテゴリ固有のシステムプロンプトを取得
    let categorySystemPrompt = '';
    let categoryName = '';
    let categoryNames: Array<string | null | undefined> = [];
    if (categoryId) {
      const [category] = await prisma.$queryRawUnsafe<CategorySummary[]>(
        'SELECT "systemPrompt", "nameJa", "nameEn", "nameZh", "name" FROM "Category" WHERE "id" = ? LIMIT 1',
        categoryId
      );
      categoryName = category?.nameJa || category?.name || categoryId;
      categoryNames = [category?.name, category?.nameJa, category?.nameEn, category?.nameZh];
      if (category?.systemPrompt) {
        categorySystemPrompt = `\n\n## ジャンル別個別指示:\n${category.systemPrompt}`;
      }
    }

    const agePersonaInstruction = buildAgePromptBlock(parsedAge);
    const languageSubjectInstruction = buildLanguageSubjectPromptBlock(categoryNames);

    const finalSystemInstruction = BASE_SYSTEM_INSTRUCTION + agePersonaInstruction + languageSubjectInstruction + categorySystemPrompt + (systemPrompt ? `\n\n## ユーザー定義の追加システム要件:\n${systemPrompt}` : '');

    let textPrompt = `
テーマ: ${topic}
ジャンル: ${categoryName || categoryId || '未指定'}
クイズ形式: ${quizType === 'CHOICE' ? '選択式(4択)' : '記述式'}
適正年齢: ${parsedAge}歳

以下の情報を参考に、多言語(日・英・中)でクイズを作成してください。
${excludeTitles && Array.isArray(excludeTitles) && excludeTitles.length > 0 ? `\n*重要*: 以下のタイトルに似た問題は避けてください: ${excludeTitles.slice(0, 10).join(', ')}` : ''}

## 品質要件
- まず最初に「この年齢がどこで面白いと感じるか」を踏まえて題材を設計してください。
- タイトル・問題文・ヒント・解説の難易度を必ずそろえてください。タイトルだけ幼い/本文だけ難しい、のような不一致は禁止です。
- 問題文は、単なる知識の丸暗記より「考える楽しさ」「気づき」「驚き」のいずれかが入るようにしてください。
- ヒントは、その年齢が自力で一歩進める内容にしてください。答えの言い換えは禁止です。
- 解説は、その年齢にとって「わかった！」という納得感が出るようにしてください。
- 日本語(ja)を基準に品質を最優先し、en/zh は内容を忠実に自然翻訳してください。
- 選択式の場合、誤答はその年齢が本当に迷いそうなものにしてください。ただし理不尽なひっかけにはしないでください。
- 幼児〜小学生では楽しい語り口と具体例を優先し、中高生以上では知的満足感と根拠を優先してください。

${finalSystemInstruction}
`;

    if (correctionPrompt) {
      textPrompt += `\n\n## ユーザーからの追加指示（補正）:\n${correctionPrompt}`;
    }

    const modelCandidates = Array.from(
      new Set([
        selectedModel,
        hybridModel.generatorId,
        'gemini-2.0-flash',
        'gemini-flash-latest',
      ])
    );

    let textResponse;
    {
      const generation = await generateQuizPayload({
        ai,
        modelsToTry: modelCandidates,
        prompt: textPrompt,
        categoryName: categoryName || categoryId || '未指定',
      });
      textResponse = generation.response;
      selectedModel = generation.model;
    }

    const resultText = textResponse.text;
    let multiLangData: any;
    try {
      multiLangData = JSON.parse(resultText || '{}');
    } catch (parseError) {
      console.error('Initial JSON parse failed. Attempting to sanitize...', parseError);
      try {
        // AIがバックスラッシュのエスケープを忘れることがあるため、補正を試みる（特にLaTeXなどで発生しやすい）
        // JSONで不正なエスケープ（\ の後に特定の文字がない）を検知して補正
        const sanitized = (resultText || '{}').replace(/\\(?![/"\\bfnrtu])/g, '\\\\');
        multiLangData = JSON.parse(sanitized);
        console.log('Sanitization successful.');
      } catch (retryError: any) {
        console.error('Sanitization also failed:', retryError);
        return NextResponse.json({ 
          error: 'INVALID_JSON', 
          message: `AIの回答形式が正しくありませんでした。もう一度お試しください。(${retryError.message})`,
          rawResponse: resultText 
        }, { status: 500 });
      }
    }

    // AIの回答構造を再帰的に検索して標準化 (ネストされている場合の対応)
    const findQuizRoot = (obj: any): any => {
      if (obj && typeof obj === 'object' && obj.ja && obj.en && obj.zh) return obj;
      if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const found = findQuizRoot(obj[key]);
          if (found) return found;
        }
      }
      return null;
    };

    multiLangData = coerceMultiLangQuizResponse(multiLangData) || multiLangData;

    if (multiLangData && !multiLangData.ja) {
      const root = findQuizRoot(multiLangData);
      if (root) multiLangData = root;
    }

    multiLangData = coerceMultiLangQuizResponse(multiLangData) || multiLangData;

    multiLangData = normalizeJapaneseQuizFields(multiLangData as MultiLangQuiz);
    if (detectLanguageSubjectRule(categoryNames)) {
      multiLangData = normalizeLanguageSubjectQuizFields(multiLangData as MultiLangQuiz);
    }

    // 必須データの存在チェック
    if (!multiLangData || !multiLangData.ja || !multiLangData.ja.question) {
      console.error('Invalid structure in AI response:', multiLangData);
      return NextResponse.json({ 
        error: 'INVALID_STRUCTURE', 
        message: 'AIの回答データの構造が不完全でした。もう一度お試しください。',
        rawResponse: multiLangData 
      }, { status: 500 });
    }

    const qualityIssues = buildQualityFeedback({
      quiz: multiLangData as MultiLangQuiz,
      age: parsedAge,
      categoryName: categoryName || categoryId || '未指定',
      categoryNames,
      requestedQuizType: (quizType || 'TEXT') as 'TEXT' | 'CHOICE',
      topic,
      correctionPrompt,
    });

    if (qualityIssues.length > 0) {
      const correctionPromptWithIssues = `${correctionPrompt ? `${correctionPrompt}\n` : ''}以下の品質問題を必ず解消してください:\n${qualityIssues.map((issue) => `- ${issue}`).join('\n')}`;
      textPrompt += `\n\n## 品質修正指示\n${qualityIssues.map((issue) => `- ${issue}`).join('\n')}`;

      const retryGeneration = await generateQuizPayload({
        ai,
        modelsToTry: modelCandidates,
        prompt: `${textPrompt}\n\n## ユーザーからの追加指示（補正）:\n${correctionPromptWithIssues}`,
        categoryName: categoryName || categoryId || '未指定',
      });
      selectedModel = retryGeneration.model;
      const retryText = retryGeneration.response.text || '{}';
      try {
        multiLangData = JSON.parse(retryText);
      } catch {
        const sanitized = retryText.replace(/\\(?![/"\\bfnrtu])/g, '\\\\');
        multiLangData = JSON.parse(sanitized);
      }
      multiLangData = coerceMultiLangQuizResponse(multiLangData) || multiLangData;
      multiLangData = normalizeJapaneseQuizFields(multiLangData as MultiLangQuiz);
      if (detectLanguageSubjectRule(categoryNames)) {
        multiLangData = normalizeLanguageSubjectQuizFields(multiLangData as MultiLangQuiz);
      }
    }

    // AI Usage Logging
    const usage = textResponse.usageMetadata;
    if (usage) {
      await logApiUsage(prisma, {
        modelId: selectedModel,
        promptTokens: usage.promptTokenCount || 0,
        candidateTokens: usage.candidatesTokenCount || 0,
        purpose: 'QUIZ_GEN'
      });
    }

    let imageUrl = providedImageUrl || '/images/no-image.png';
    const imageGenerationEnabled = process.env.ENABLE_GEMINI_IMAGE_GENERATION === 'true';
    if (!providedImageUrl && imageGenerationEnabled) {
      // 画像生成用のプロンプトを最適化
      const imageCommand = `Educational illustration for kids/adults (Age ${parsedAge}). 
Theme: ${topic}. 
Description: ${multiLangData.ja.question}. 
Style: ${persona.imageStyle} 
Requirement: No text inside the image. Vibrant if for children, professional if for adults. High quality.`;

      let generatedImage: string | undefined;
      try {
        const imageResponse = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: imageCommand,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/jpeg',
          },
        });
        generatedImage = imageResponse.generatedImages?.[0]?.image?.imageBytes;
      } catch (imageError) {
        console.warn("Image generation API call failed. Falling back to placeholder image.", imageError);
      }

      if (generatedImage) {
        imageUrl = `data:image/jpeg;base64,${generatedImage}`;
      }
    }

    // AIの回答からクイズ形式を決定 (AIが自動で変更した場合に対応)
    const actualQuizType = (multiLangData.ja.type || quizType || 'TEXT') as 'TEXT' | 'CHOICE';

    const jaOptions = actualQuizType === 'CHOICE' ? normalizeChoiceOptions(multiLangData.ja.options) : undefined;
    const enOptions = actualQuizType === 'CHOICE' ? normalizeChoiceOptions(multiLangData.en.options) : undefined;
    const zhOptions = actualQuizType === 'CHOICE' ? normalizeChoiceOptions(multiLangData.zh.options) : undefined;

    // DBへ保存
    const savedQuiz = await prisma.quiz.create({
      data: {
        categoryId: categoryId,
        targetAge: parsedAge,
        imageUrl: imageUrl || '',
        translations: {
          create: [
            {
              locale: 'ja',
              title: multiLangData.ja.title || topic || 'クイズ',
              question: multiLangData.ja.question,
              hint: multiLangData.ja.hint,
              answer: multiLangData.ja.answer,
              explanation: multiLangData.ja.explanation || '',
              type: actualQuizType,
              options: jaOptions,
            },
            {
              locale: 'en',
              title: multiLangData.en.title || topic || 'Quiz',
              question: multiLangData.en.question,
              hint: multiLangData.en.hint,
              answer: multiLangData.en.answer,
              explanation: multiLangData.en.explanation || '',
              type: actualQuizType,
              options: enOptions,
            },
            {
              locale: 'zh',
              title: multiLangData.zh.title || topic || '问答',
              question: multiLangData.zh.question,
              hint: multiLangData.zh.hint,
              answer: multiLangData.zh.answer,
              explanation: multiLangData.zh.explanation || '',
              type: actualQuizType,
              options: zhOptions,
            },
          ]
        }
      },
      include: {
        translations: true
      }
    });
    return NextResponse.json({ ...multiLangData.ja, options: jaOptions, id: savedQuiz.id, imageUrl });

  } catch (error: any) {
    console.error('API Error details:', error);
    
    const status = error.status || error.response?.status || 500;
    const errorMessage = error.message || '';

    if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota')) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: 'AIの利用制限（クォータ）に達しました。無料枠の制限または支払い設定を確認してください。1分ほど待ってから再度お試しください。' },
        { status: 429 }
      );
    }

    if (status === 404 || errorMessage.includes('404') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'MODEL_NOT_FOUND', message: `指定されたモデル (${selectedModel}) が見つからないか、現在のAPIキーで利用できません。モデル設定を確認してください。` },
        { status: 404 }
      );
    }

    if (status === 503 || errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE', message: 'AIサービスが一時的に混み合っています。少し時間を置いてから再度お試しください。' },
        { status: 503 }
      );
    }

    if (status === 401 || status === 403 || errorMessage.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'AUTH_ERROR', message: 'APIキーが無効であるか、認証に失敗しました。設定を確認してください。' },
        { status: status === 401 ? 401 : 403 }
      );
    }

    return NextResponse.json({ 
      error: 'Failed to generate quiz', 
      message: `クイズの生成中にエラーが発生しました。詳細は管理者にお問い合わせください。(${status})` 
    }, { status: 500 });
  }
}
