/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/quiz/translate/route.ts
// Title: Admin Quiz Translation API
// Purpose: Multi-language translation for manually created quizzes using AI.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import {
  buildAgePromptBlock,
  buildEducationalContextPrompt,
  BASE_SYSTEM_INSTRUCTION,
} from '@/lib/ai-prompts';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import {
  generateAIText,
  hasAnyAIProvider,
  inferAIProvider,
  isRetryableAIError,
  type AITextResult,
} from '@/lib/ai-provider';

async function generateTranslation(params: {
  preferredModel: string;
  prompt: string;
  env: Record<string, unknown>;
}): Promise<AITextResult> {
  const provider = inferAIProvider(params.preferredModel);
  const candidates = provider === 'openai'
    ? [params.preferredModel, 'gpt-5.4-mini', 'gemini-2.5-flash']
    : [params.preferredModel, 'gemini-2.5-flash', 'gpt-5.4-mini'];
  let lastError: unknown;

  for (const model of Array.from(new Set(candidates))) {
    try {
      return await generateAIText({
        model,
        prompt: params.prompt,
        systemInstruction: 'Return only valid JSON with en and zh objects.',
        env: params.env,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableAIError(error)) throw error;
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);

    // Budget Check
    const budget = await checkApiBudget(prisma);
    if (budget.exceeded) {
      return NextResponse.json({
        error: 'BUDGET_EXCEEDED',
        message: `月間のAPI制約額 ($${budget.limit}) に達しました。`
      }, { status: 403 });
    }

    const runtimeEnv = env as unknown as Record<string, unknown>;
    if (!hasAnyAIProvider(runtimeEnv)) {
      return NextResponse.json({ error: 'CONFIG_ERROR', message: 'APIキーが設定されていません。' }, { status: 500 });
    }

    const body = (await req.json()) as any;
    const { ja, targetAge, categoryId, modelId = DEFAULT_MODEL_ID } = body;
    const selectedModel = getModelById(modelId);

    // カテゴリ名を取得
    let categoryNames: Array<string | null | undefined> = [];
    if (categoryId) {
      const category: any = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true, nameJa: true, nameEn: true, nameZh: true }
      });
      if (category) {
        categoryNames = [category.name, category.nameJa, category.nameEn, category.nameZh];
      }
    }

    const parsedAge = parseInt(targetAge) || 8;
    const agePersonaInstruction = buildAgePromptBlock(parsedAge);

    // DBから教育課程ガイドラインを取得
    const eduSetting = await prisma.setting.findUnique({ where: { key: 'educational_guidelines' } });
    const guidelines = eduSetting?.value ? JSON.parse(eduSetting.value) : null;
    const educationalContextInstruction = buildEducationalContextPrompt(parsedAge, categoryNames, guidelines);

    const systemInstruction = BASE_SYSTEM_INSTRUCTION + agePersonaInstruction + educationalContextInstruction;

    const prompt = `
以下の日本語のクイズ内容を、英語(en)と中国語(zh)に翻訳・最適化してください。
ターゲット年齢は ${parsedAge}歳 です。

## 翻訳対象データ (日本語)
${JSON.stringify(ja, null, 2)}

## 翻訳の要件
- ターゲット年齢に合わせた適切な語彙・表現を使用してください。
- 意味を変えず、各言語で自然かつ教育的な表現にしてください。
- 記述式(TEXT)の場合は、回答のしやすさを考慮して、必要に応じて選択式(CHOICE)の選択肢(options)も生成してください。
- 数式が含まれる場合は LaTeX 形式を維持し、JSONのエスケープルールに従ってください。
- 出力は en と zh のオブジェクト（それぞれ title, question, hint, answer, explanation, type, options を持つ）を含むJSON形式にしてください。

${systemInstruction}
`;

    const modelName = selectedModel.generatorId;
    const result = await generateTranslation({
      preferredModel: modelName,
      prompt,
      env: runtimeEnv,
    });

    const resultText = result.text;
    let translatedData: any;
    try {
      const raw = resultText || '{}';
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      translatedData = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
    } catch (e) {
      console.error('Initial JSON parse failed. Attempting to sanitize...', e);
      const sanitized = (resultText || '{}').replace(/\\(?![/"\\bfnrtu])/g, '\\\\');
      translatedData = JSON.parse(sanitized);
    }

    // AI Usage Logging
    if (result.usage.promptTokens || result.usage.candidateTokens) {
      await logApiUsage(prisma, {
        modelId: result.model,
        promptTokens: result.usage.promptTokens,
        candidateTokens: result.usage.candidateTokens,
        purpose: 'QUIZ_TRANSLATION'
      });
    }

    return NextResponse.json(translatedData);
  } catch (error: any) {
    console.error('Translation API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
