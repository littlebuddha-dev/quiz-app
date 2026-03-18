// Path: app/api/quiz-generator/route.ts
export const runtime = 'edge';
// Title: Quiz Generator API Route
// Purpose: Generates quiz text and illustration using Google Gen AI based on topic, category, age, and type.

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getPersonaByAge, BASE_SYSTEM_INSTRUCTION } from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID } from '@/lib/ai-models';
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

    const selectedModel = modelId || DEFAULT_MODEL_ID;
    const parsedAge = parseInt(targetAge) || 8;
    const persona = getPersonaByAge(parsedAge);

    // カテゴリ固有のシステムプロンプトを取得
    let categorySystemPrompt = '';
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { systemPrompt: true }
      });
      if (category?.systemPrompt) {
        categorySystemPrompt = `\n\n## ジャンル別個別指示:\n${category.systemPrompt}`;
      }
    }

    const agePersonaInstruction = `
## 対象年齢 (${parsedAge}歳) 向け特別指示 [${persona.description}]:
${persona.guidelines.map(g => `* ${g}`).join('\n')}
`;

    const finalSystemInstruction = BASE_SYSTEM_INSTRUCTION + agePersonaInstruction + categorySystemPrompt + (systemPrompt ? `\n\n## ユーザー定義の追加システム要件:\n${systemPrompt}` : '');

    let textPrompt = `
テーマ: ${topic}
クイズ形式: ${quizType === 'CHOICE' ? '選択式(4択)' : '記述式'}
適正年齢: ${parsedAge}歳

以下の情報を参考に、多言語(日・英・中)でクイズを作成してください。
${excludeTitles && Array.isArray(excludeTitles) && excludeTitles.length > 0 ? `\n*重要*: 以下のタイトルに似た問題は避けてください: ${excludeTitles.slice(0, 10).join(', ')}` : ''}

${finalSystemInstruction}
`;

    if (correctionPrompt) {
      textPrompt += `\n\n## ユーザーからの追加指示（補正）:\n${correctionPrompt}`;
    }

    const textResponse = await ai.models.generateContent({
      model: selectedModel,
      contents: textPrompt,
      config: { responseMimeType: "application/json" },
    });

    const resultText = textResponse.text;
    const multiLangData = JSON.parse(resultText || '{}');

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

    let imageUrl = providedImageUrl;
    if (!imageUrl) {
      // 画像生成用のプロンプトを最適化
      const imageCommand = `Educational illustration for kids/adults (Age ${parsedAge}). Theme: ${topic}. 
Description: ${multiLangData.ja.question}. 
Style: Whimsical, storybook, or flat clean design depending on age appropriateness. 
Requirement: No text inside the image. Vibrant colors. High quality.`;

      const imageResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: imageCommand,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg',
        },
      });

      const generatedImage = imageResponse.generatedImages?.[0]?.image?.imageBytes;
      if (!generatedImage) {
        console.warn("Image generation failed, using fallback or empty.");
        // imageUrl remains empty or use a placeholder if available
      } else {
        imageUrl = `data:image/jpeg;base64,${generatedImage}`;
      }
    }

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
              title: multiLangData.ja.title,
              question: multiLangData.ja.question,
              hint: multiLangData.ja.hint,
              answer: multiLangData.ja.answer,
              type: quizType,
              options: quizType === 'CHOICE' && multiLangData.ja.options ? (JSON.stringify(multiLangData.ja.options) as any) : undefined,
            },
            {
              locale: 'en',
              title: multiLangData.en.title,
              question: multiLangData.en.question,
              hint: multiLangData.en.hint,
              answer: multiLangData.en.answer,
              type: quizType,
              options: quizType === 'CHOICE' && multiLangData.en.options ? (JSON.stringify(multiLangData.en.options) as any) : undefined,
            },
            {
              locale: 'zh',
              title: multiLangData.zh.title,
              question: multiLangData.zh.question,
              hint: multiLangData.zh.hint,
              answer: multiLangData.zh.answer,
              type: quizType,
              options: quizType === 'CHOICE' && multiLangData.zh.options ? (JSON.stringify(multiLangData.zh.options) as any) : undefined,
            }
          ]
        }
      },
      include: {
        translations: true
      }
    });

    return NextResponse.json({ ...multiLangData.ja, id: savedQuiz.id, imageUrl });

  } catch (error: any) {
    console.error('API Error:', error);

    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: 'AIの利用制限に達しました。1分ほど待ってから再度お試しください。' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: 'Failed to generate quiz', message: 'クイズの生成中にエラーが発生しました。' }, { status: 500 });
  }
}