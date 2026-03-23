/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/quiz/translate/route.ts
// Title: Admin Quiz Translation API
// Purpose: Multi-language translation for manually created quizzes using AI.

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import {
  buildAgePromptBlock,
  buildEducationalContextPrompt,
  BASE_SYSTEM_INSTRUCTION,
} from '@/lib/ai-prompts';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'CONFIG_ERROR', message: 'APIキーが設定されていません。' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const body = (await req.json()) as any;
    const { ja, targetAge, categoryId } = body;

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

    const modelName = 'gemini-2.0-flash';
    const result = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const resultText = result.text;
    let translatedData: any;
    try {
      translatedData = JSON.parse(resultText || '{}');
    } catch (e) {
      console.error('Initial JSON parse failed. Attempting to sanitize...', e);
      const sanitized = (resultText || '{}').replace(/\\(?![/"\\bfnrtu])/g, '\\\\');
      translatedData = JSON.parse(sanitized);
    }

    // AI Usage Logging
    const usage = result.usageMetadata;
    if (usage) {
      await logApiUsage(prisma, {
        modelId: 'gemini-2.0-flash',
        promptTokens: usage.promptTokenCount || 0,
        candidateTokens: usage.candidatesTokenCount || 0,
        purpose: 'QUIZ_TRANSLATION'
      });
    }

    return NextResponse.json(translatedData);
  } catch (error: any) {
    console.error('Translation API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
