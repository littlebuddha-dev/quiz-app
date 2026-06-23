/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import {
  BASE_SYSTEM_INSTRUCTION,
  buildAgePromptBlock,
  buildEducationalContextPrompt,
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

async function generateImprovedQuiz(params: {
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
        systemInstruction: 'Return only valid JSON with ja, en, and zh objects.',
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const budget = await checkApiBudget(prisma);
    if (budget.exceeded) {
      return NextResponse.json({
        error: 'BUDGET_EXCEEDED',
        message: `月間のAPI制約額 ($${budget.limit}) に達しました。`,
      }, { status: 403 });
    }

    const runtimeEnv = env as unknown as Record<string, unknown>;
    if (!hasAnyAIProvider(runtimeEnv)) {
      return NextResponse.json({ error: 'CONFIG_ERROR', message: 'APIキーが設定されていません。' }, { status: 500 });
    }

    const body = (await req.json()) as any;
    const { ja, targetAge, categoryId, modelId = DEFAULT_MODEL_ID } = body;
    if (!ja?.title || !ja?.question || !ja?.answer) {
      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const selectedModel = getModelById(modelId);
    let categoryNames: Array<string | null | undefined> = [];
    let categoryLabel = categoryId || '未指定';
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true, nameJa: true, nameEn: true, nameZh: true, systemPrompt: true },
      });
      if (category) {
        categoryLabel = category.nameJa || category.name || categoryLabel;
        categoryNames = [category.name, category.nameJa, category.nameEn, category.nameZh];
      }
    }

    const parsedAge = parseInt(targetAge) || 8;
    const agePersonaInstruction = buildAgePromptBlock(parsedAge);
    const eduSetting = await prisma.setting.findUnique({ where: { key: 'educational_guidelines' } });
    const guidelines = eduSetting?.value ? JSON.parse(eduSetting.value) : null;
    const educationalContextInstruction = buildEducationalContextPrompt(parsedAge, categoryNames, guidelines);
    const prompt = `以下の既存クイズを、教育メディアとしての価値が高まるように全面的に改善してください。

## 対象条件
- ジャンル: ${categoryLabel}
- 対象年齢: ${parsedAge}歳

## 現在の日本語クイズ
${JSON.stringify(ja, null, 2)}

## 改善要件
- 元の学習テーマは保ちつつ、問題文・正答・ヒント・解説を必要なら修正して、正確で一意に答えられる問題へ改善してください。
- title は短く、question は何を考えればよいか明確にしてください。
- explanation は回答直後の短い解説として端的にまとめてください。
- detailedExplanation は記事本文のように詳しく、背景知識、考え方、誤解しやすい点、実生活とのつながりまで含めてください。
- learningPoints は3〜5行の箇条書き風テキストにしてください。
- relatedKnowledge は関連知識や次に学ぶとよい内容を1〜3段落で補ってください。
- sources は出典や監修元を2〜4行、references は参考文献や参考資料を2〜4行で示してください。URLの捏造は禁止です。
- 出力は ja / en / zh の3言語すべてを含め、各言語に title, question, hint, answer, explanation, detailedExplanation, learningPoints, relatedKnowledge, sources, references, type, options を持たせてください。

${BASE_SYSTEM_INSTRUCTION}
${agePersonaInstruction}
${educationalContextInstruction}`;

    const result = await generateImprovedQuiz({
      preferredModel: selectedModel.generatorId,
      prompt,
      env: runtimeEnv,
    });

    const raw = result.text || '{}';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);

    if (result.usage.promptTokens || result.usage.candidateTokens) {
      await logApiUsage(prisma, {
        modelId: result.model,
        promptTokens: result.usage.promptTokens,
        candidateTokens: result.usage.candidateTokens,
        purpose: 'QUIZ_IMPROVE',
      });
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Quiz Improve API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
