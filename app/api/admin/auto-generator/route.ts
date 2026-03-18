// Path: app/api/admin/auto-generator/route.ts
// Title: Automated Bulk Quiz Generator API
// Purpose: Automatically suggests unique topics and generates multiple quizzes for a category and age.

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getPersonaByAge } from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

export const runtime = 'edge';

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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as any;
    const { categoryId, targetAge, quantity, quizType, modelId } = body;
    const hybridModel = getModelById(modelId || DEFAULT_MODEL_ID);
    const parsedAge = parseInt(targetAge) || 8;
    const count = Math.min(parseInt(quantity) || 3, 10); // Max 10 at once

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API_KEY_MISSING' }, { status: 500 });
    const ai = new GoogleGenAI({ apiKey });

    // 1. Get existing quiz titles for this category/age to ensure uniqueness
    const existingQuizzes = await prisma.quiz.findMany({
      where: { categoryId, targetAge: parsedAge },
      include: { translations: { where: { locale: 'ja' } } }
    });
    const existingTitles = existingQuizzes.map(q => q.translations[0]?.title).filter(Boolean) as string[];

    const [category] = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; nameJa: string | null }>>(
      'SELECT "id", "name", "nameJa" FROM "Category" WHERE "id" = ? LIMIT 1',
      categoryId
    );
    const persona = getPersonaByAge(parsedAge);

    // 2. Ask Gemini (Planner) to suggest N unique sub-topics
    const topicSuggestionPrompt = `
あなたは教育プランナーです。「${category?.nameJa || category?.name || '一般'}」というジャンルで、${parsedAge}歳 (${persona.description}) 向けに、新しく面白いクイズのトピックを ${count} 個提案してください。

## 既存のトピック (これらは避けてください):
${existingTitles.join(', ')}

## 制約:
* 各トピックは具体的で、1つのクイズとして成立するものにしてください。
* 重複を避け、幅広い知識をカバーするようにしてください。
* 教育的価値が高いものを優先してください。
* 出力はJSON形式で、キー "topics" に文字列の配列を入れてください。
`;

    const suggestionResponse = await ai.models.generateContent({
      model: hybridModel.plannerId,
      contents: topicSuggestionPrompt,
      config: { responseMimeType: "application/json" },
    });

    const suggestionText = suggestionResponse.text;
    const usage = suggestionResponse.usageMetadata;
    if (usage) {
      await logApiUsage(prisma, {
        modelId: hybridModel.plannerId,
        promptTokens: usage.promptTokenCount || 0,
        candidateTokens: usage.candidatesTokenCount || 0,
        purpose: 'TOPIC_SUGGEST'
      });
    }

    const suggestionData = JSON.parse(suggestionText || '{"topics":[]}');
    const suggestedTopics = suggestionData.topics || [];

    // 3. Sequential generation
    const results = [];
    const baseUrl = new URL(req.url).origin;

    for (const topic of suggestedTopics) {
      try {
        const genRes = await fetch(`${baseUrl}/api/quiz-generator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            categoryId: categoryId as string,
            targetAge: parsedAge,
            quizType: quizType || 'TEXT',
            excludeTitles: existingTitles,
            modelId: hybridModel.generatorId
          })
        });
        if (genRes.ok) {
          const data = await genRes.json();
          results.push(data as any);
        } else {
          console.error(`Failed to generate for topic: ${topic}`);
        }
      } catch (e) {
        console.error(e);
      }
    }

    return NextResponse.json({ success: true, count: results.length, quizzes: results });

  } catch (error: any) {
    console.error('Auto-generator Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
