/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/auto-generator/route.ts
// Title: Automated Bulk Quiz Generator API
// Purpose: Automatically suggests unique topics and generates multiple quizzes for a category and age.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { buildTopicPlannerPrompt } from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';
import {
  generateAIText,
  hasAnyAIProvider,
  inferAIProvider,
  isRetryableAIError,
  type AITextResult,
} from '@/lib/ai-provider';

type CategorySummary = { id: string; name: string; nameJa: string | null };
type CategoryCountRow = {
  categoryId: string;
  _count: { id: number };
  _max?: { createdAt: Date | null };
};

function normalizeSuggestedTopics(rawTopics: unknown): string[] {
  if (!Array.isArray(rawTopics)) return [];

  const topics = rawTopics
    .map((topic) => {
      if (typeof topic === 'string') return topic.trim();
      if (topic && typeof topic === 'object') {
        const candidate =
          (typeof (topic as any).title === 'string' && (topic as any).title) ||
          (typeof (topic as any).topic === 'string' && (topic as any).topic) ||
          (typeof (topic as any).name === 'string' && (topic as any).name);
        return candidate ? candidate.trim() : '';
      }
      return '';
    })
    .filter(Boolean);

  return Array.from(new Set(topics));
}

function parseJsonObject(raw: string) {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced);
}

async function generateTopicSuggestions(params: {
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
        systemInstruction: 'Return only valid JSON with a topics array.',
        env: params.env,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableAIError(error)) throw error;
    }
  }

  throw lastError;
}

function getInternalBaseUrl(req: NextRequest) {
  const explicitInternalUrl = process.env.INTERNAL_APP_URL?.trim();
  if (explicitInternalUrl) {
    return explicitInternalUrl.replace(/\/+$/, '');
  }

  const requestUrl = new URL(req.url);
  const port = process.env.PORT || requestUrl.port || '3000';

  if (process.env.NODE_ENV === 'production') {
    return `http://127.0.0.1:${port}`;
  }

  return requestUrl.origin.replace(/\/+$/, '');
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  try {
    const response = await fetch(url, init);
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`[auto-generator] network fetch failed for ${url}. Retrying...`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(url, init, retries - 1);
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
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

    // Auth Check
    const cronSecret = req.headers.get('x-cron-secret');
    const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isCron) {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = (await req.json()) as any;
    const { categoryId, targetAge, quantity, quizType, modelId, autoBalance } = body;
    const hybridModel = getModelById(modelId || DEFAULT_MODEL_ID);
    const parsedAge = parseInt(targetAge) || 8;
    const count = Math.min(parseInt(quantity) || 3, 10); // Max 10 at once

    const runtimeEnv = env as unknown as Record<string, unknown>;
    if (!hasAnyAIProvider(runtimeEnv)) {
      return NextResponse.json({ error: 'API_KEY_MISSING' }, { status: 500 });
    }

    // 1. Get Categories to process
    let categoriesToProcess: CategorySummary[] = [];
    let generationUnits: Array<{ category: CategorySummary; age: number }> = [];
    
    if (autoBalance) {
      const allCategoriesRaw = await prisma.category.findMany({
        select: { id: true, name: true, nameJa: true },
        orderBy: { sortOrder: 'asc' }
      });
      const allCategories = allCategoriesRaw.filter((category) => category.id !== 'その他');
      
      const counts = await (prisma.quiz as any).groupBy({
        by: ['categoryId', 'targetAge'],
        _count: { id: true }
      });
      const categoryTotals = await (prisma.quiz as any).groupBy({
        by: ['categoryId'],
        _count: { id: true },
        _max: { createdAt: true }
      }) as CategoryCountRow[];

      const countMap = new Map();
      counts.forEach((c: any) => {
        countMap.set(`${c.categoryId}-${c.targetAge}`, c._count.id);
      });
      const categoryTotalMap = new Map<string, number>();
      const categoryLastCreatedAtMap = new Map<string, number>();
      categoryTotals.forEach((row) => {
        categoryTotalMap.set(row.categoryId, row._count.id);
        categoryLastCreatedAtMap.set(row.categoryId, row._max?.createdAt ? new Date(row._max.createdAt).getTime() : 0);
      });

      const rankedCombos = allCategories
        .flatMap((cat) =>
          Array.from({ length: 19 }, (_, age) => ({
            category: cat as CategorySummary,
            age,
            totalCount: categoryTotalMap.get(cat.id) || 0,
            count: countMap.get(`${cat.id}-${age}`) || 0,
            lastCreatedAt: categoryLastCreatedAtMap.get(cat.id) || 0,
          }))
        )
        .sort((a, b) => {
          if (a.totalCount !== b.totalCount) return a.totalCount - b.totalCount;
          if (a.count !== b.count) return a.count - b.count;
          if (a.lastCreatedAt !== b.lastCreatedAt) return a.lastCreatedAt - b.lastCreatedAt;
          if (a.category.nameJa !== b.category.nameJa) return (a.category.nameJa || a.category.name).localeCompare(b.category.nameJa || b.category.name);
          return a.age - b.age;
        })
        .slice(0, count);

      generationUnits = rankedCombos.map((combo) => ({
        category: combo.category,
        age: combo.age,
      }));
      categoriesToProcess = Array.from(new Map(generationUnits.map((unit) => [unit.category.id, unit.category])).values());
    } else {
      if (categoryId === 'all') {
        categoriesToProcess = (await prisma.category.findMany({
          select: { id: true, name: true, nameJa: true },
          orderBy: { sortOrder: 'asc' }
        })) as any;
      } else {
        const cat = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true, nameJa: true }
        });
        if (cat) categoriesToProcess.push(cat as any);
      }

      generationUnits = categoriesToProcess.map((category) => ({
        category,
        age: parsedAge,
      }));
    }


    if (generationUnits.length === 0) {
      return NextResponse.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 404 });
    }

    const results = [];
    const generationErrors: string[] = [];
    const baseUrl = getInternalBaseUrl(req);

    // 2. Process each generation unit
    for (const unit of generationUnits) {
      const category = unit.category;
      const targetAgeForUnit = unit.age;
      // Uniqueness check for this specific category
      const existingQuizzes = await prisma.quiz.findMany({
        where: { categoryId: category.id, targetAge: targetAgeForUnit },
        include: { translations: { where: { locale: 'ja' } } }
      });
      const existingTitles = existingQuizzes.map(q => q.translations[0]?.title).filter(Boolean) as string[];

      // autoBalanceでは各不足ユニットに1件ずつ割り当てる
      const countForThisCat = autoBalance ? 1 : categoryId === 'all' ? Math.min(count, 2) : count;

      const topicSuggestionPrompt = buildTopicPlannerPrompt(
        targetAgeForUnit,
        category.nameJa || category.name,
        countForThisCat,
        existingTitles
      );

      try {
        const suggestionResponse = await generateTopicSuggestions({
          preferredModel: hybridModel.plannerId,
          prompt: topicSuggestionPrompt,
          env: runtimeEnv,
        });

        const suggestionData = parseJsonObject(suggestionResponse.text || '{"topics":[]}');
        let suggestedTopics = normalizeSuggestedTopics(suggestionData.topics);
        if (suggestedTopics.length === 0) {
          suggestedTopics = [
            `${category.nameJa || category.name}の基礎`,
            `${category.nameJa || category.name}の応用`,
            `${category.nameJa || category.name}の考え方`,
          ].slice(0, countForThisCat);
        }

        // Log Usage
        if (suggestionResponse.usage.promptTokens || suggestionResponse.usage.candidateTokens) {
          await logApiUsage(prisma, {
            modelId: suggestionResponse.model,
            promptTokens: suggestionResponse.usage.promptTokens,
            candidateTokens: suggestionResponse.usage.candidateTokens,
            purpose: 'TOPIC_SUGGEST'
          });
        }

        // 3. Generate Quizzes for suggested topics
        // 元リクエストのCookieを取得（認証情報の転送用）
        const forwardCookie = req.headers.get('cookie');
        for (const topic of suggestedTopics) {
          try {
            const buildGeneratorBody = (override: Partial<Record<string, unknown>> = {}) => ({
              topic,
              categoryId: category.id,
              targetAge: targetAgeForUnit,
              quizType: quizType || 'TEXT',
              excludeTitles: existingTitles,
              modelId: hybridModel.id,
              visualMode: 'image_only',
              deferImageGeneration: true,
              ...override,
            });

            let genRes = await fetchWithRetry(`${baseUrl}/api/quiz-generator`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(forwardCookie ? { cookie: forwardCookie } : {}),
              },
              body: JSON.stringify(buildGeneratorBody())
            });

            if (!genRes.ok) {
              const firstErrorText = await genRes.text();
              console.warn(`[auto-generator] first quiz-generator attempt failed for topic "${topic}":`, genRes.status, firstErrorText);

              genRes = await fetchWithRetry(`${baseUrl}/api/quiz-generator`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(forwardCookie ? { cookie: forwardCookie } : {}),
                },
                body: JSON.stringify(
                  buildGeneratorBody({
                    correctionPrompt: 'JSON構造を厳守し、教育的に安定した1問に絞って生成してください。',
                    excludeTitles: [],
                  })
                )
              });
            }

            if (genRes.ok) {
              const quizData = (await genRes.json()) as any;
              results.push(quizData);

              // 遅延画像生成: クイズ保存後に画像を個別生成
              if (quizData?.id) {
                try {
                  const imageRes = await fetchWithRetry(`${baseUrl}/api/admin/quiz/generate-image`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(forwardCookie ? { cookie: forwardCookie } : {}),
                    },
                    body: JSON.stringify({
                      quizId: quizData.id,
                      locale: 'all',
                      force: true,
                      modelId: hybridModel.id,
                    }),
                  });
                  if (!imageRes.ok) {
                    const errText = await imageRes.text();
                    console.warn(`[auto-generator] image generation failed for quiz ${quizData.id}:`, errText);
                  } else {
                    console.log(`[auto-generator] image generated for quiz ${quizData.id}`);
                  }
                } catch (imgErr) {
                  console.warn(`[auto-generator] image generation error for quiz ${quizData.id}:`, imgErr);
                }
              }
            } else {
              const errBody = await genRes.text();
              console.error(`quiz-generator failed for topic "${topic}":`, genRes.status, errBody);
              generationErrors.push(`${category.id}/${targetAgeForUnit}/${topic}: ${genRes.status} ${errBody.slice(0, 180)}`);
            }
          } catch (fetchErr) {
            console.error(`Failed to fetch quiz-generator for topic "${topic}":`, fetchErr);
            generationErrors.push(`${category.id}/${targetAgeForUnit}/${topic}: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
          }
        }
      } catch (err) {
        console.error(`Error processing category ${category.id} age ${targetAgeForUnit}:`, err);
        generationErrors.push(`${category.id}/${targetAgeForUnit}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        error: 'NO_QUIZZES_GENERATED', 
        message: 'トピックの提案は成功しましたが、クイズの生成に失敗しました。サーバーログを確認してください。',
        details: generationErrors.slice(0, 5).join(' | '),
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length, 
      categoriesProcessed: categoriesToProcess.length,
      unitsProcessed: generationUnits.length,
    });

  } catch (error: any) {
    console.error('Auto-generator Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
