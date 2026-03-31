/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/auto-generator/route.ts
// Title: Automated Bulk Quiz Generator API
// Purpose: Automatically suggests unique topics and generates multiple quizzes for a category and age.

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { buildTopicPlannerPrompt } from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

type CategorySummary = { id: string; name: string; nameJa: string | null };

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
    let parsedAge = parseInt(targetAge) || 8;
    const count = Math.min(parseInt(quantity) || 3, 10); // Max 10 at once

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API_KEY_MISSING' }, { status: 500 });
    const ai = new GoogleGenAI({ apiKey });

    // 1. Get Categories to process
    let categoriesToProcess: CategorySummary[] = [];
    let generationUnits: Array<{ category: CategorySummary; age: number }> = [];
    
    if (autoBalance) {
      const allCategoriesRaw = await prisma.category.findMany({
        select: { id: true, name: true, nameJa: true },
        orderBy: { sortOrder: 'asc' }
      });
      
      const counts = await (prisma.quiz as any).groupBy({
        by: ['categoryId', 'targetAge'],
        _count: { id: true }
      });

      const countMap = new Map();
      counts.forEach((c: any) => {
        countMap.set(`${c.categoryId}-${c.targetAge}`, c._count.id);
      });

      const rankedCombos = allCategoriesRaw
        .flatMap((cat) =>
          Array.from({ length: 19 }, (_, age) => ({
            category: cat as CategorySummary,
            age,
            count: countMap.get(`${cat.id}-${age}`) || 0,
          }))
        )
        .sort((a, b) => {
          if (a.count !== b.count) return a.count - b.count;
          if (a.category.id !== b.category.id) return a.category.id.localeCompare(b.category.id);
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
    const baseUrl = new URL(req.url).origin;

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
        const suggestionResponse = await ai.models.generateContent({
          model: hybridModel.plannerId,
          contents: topicSuggestionPrompt,
          config: { responseMimeType: "application/json" },
        });

        const suggestionData = JSON.parse(suggestionResponse.text || '{"topics":[]}');
        const suggestedTopics = suggestionData.topics || [];

        // Log Usage
        const usage = suggestionResponse.usageMetadata;
        if (usage) {
          await logApiUsage(prisma, {
            modelId: hybridModel.plannerId,
            promptTokens: usage.promptTokenCount || 0,
            candidateTokens: usage.candidatesTokenCount || 0,
            purpose: 'TOPIC_SUGGEST'
          });
        }

        // 3. Generate Quizzes for suggested topics
        // 元リクエストのCookieを取得（認証情報の転送用）
        const forwardCookie = req.headers.get('cookie');
        for (const topic of suggestedTopics) {
          try {
            const genRes = await fetch(`${baseUrl}/api/quiz-generator`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(forwardCookie ? { cookie: forwardCookie } : {}),
              },
              body: JSON.stringify({
                topic,
                categoryId: category.id,
                targetAge: targetAgeForUnit,
                quizType: quizType || 'TEXT',
                excludeTitles: existingTitles,
                modelId: hybridModel.generatorId,
                visualMode: 'image_only',
                deferImageGeneration: true,
              })
            });
            if (genRes.ok) {
              const quizData = (await genRes.json()) as any;
              results.push(quizData);

              // 遅延画像生成: クイズ保存後に画像を個別生成
              if (quizData?.id) {
                try {
                  const imageRes = await fetch(`${baseUrl}/api/admin/quiz/generate-image`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(forwardCookie ? { cookie: forwardCookie } : {}),
                    },
                    body: JSON.stringify({
                      quizId: quizData.id,
                      locale: 'all',
                      force: true,
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
            }
          } catch (fetchErr) {
            console.error(`Failed to fetch quiz-generator for topic "${topic}":`, fetchErr);
          }
        }
      } catch (err) {
        console.error(`Error processing category ${category.id} age ${targetAgeForUnit}:`, err);
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        error: 'NO_QUIZZES_GENERATED', 
        message: 'トピックの提案は成功しましたが、クイズの生成に失敗しました。サーバーログを確認してください。' 
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
