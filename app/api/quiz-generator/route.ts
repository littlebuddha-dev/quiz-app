// Path: app/api/quiz-generator/route.ts
export const runtime = 'edge';
// Title: Quiz Generator API Route
// Purpose: Generates quiz text and illustration using Google Gen AI based on topic, category, age, and type.

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getPersonaByAge, BASE_SYSTEM_INSTRUCTION } from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { checkApiBudget, logApiUsage } from '@/lib/ai-usage';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

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
    if (categoryId) {
      const [category] = await prisma.$queryRawUnsafe<Array<{ systemPrompt: string | null; nameJa: string | null; name: string }>>(
        'SELECT "systemPrompt", "nameJa", "name" FROM "Category" WHERE "id" = ? LIMIT 1',
        categoryId
      );
      categoryName = category?.nameJa || category?.name || categoryId;
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
ジャンル: ${categoryName || categoryId || '未指定'}
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

    if (multiLangData && !multiLangData.ja) {
      const root = findQuizRoot(multiLangData);
      if (root) multiLangData = root;
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
    if (!providedImageUrl) {
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
        console.warn("Image generation API call failed:", imageError);
      }

      if (generatedImage) {
        imageUrl = `data:image/jpeg;base64,${generatedImage}`;
      }
    }

    // AIの回答からクイズ形式を決定 (AIが自動で変更した場合に対応)
    const actualQuizType = (multiLangData.ja.type || quizType || 'TEXT') as 'TEXT' | 'CHOICE';

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
              options: actualQuizType === 'CHOICE' && multiLangData.ja.options ? (JSON.stringify(multiLangData.ja.options) as any) : undefined,
            },
            {
              locale: 'en',
              title: multiLangData.en.title || topic || 'Quiz',
              question: multiLangData.en.question,
              hint: multiLangData.en.hint,
              answer: multiLangData.en.answer,
              explanation: multiLangData.en.explanation || '',
              type: actualQuizType,
              options: actualQuizType === 'CHOICE' && multiLangData.en.options ? (JSON.stringify(multiLangData.en.options) as any) : undefined,
            },
            {
              locale: 'zh',
              title: multiLangData.zh.title || topic || '问答',
              question: multiLangData.zh.question,
              hint: multiLangData.zh.hint,
              answer: multiLangData.zh.answer,
              explanation: multiLangData.zh.explanation || '',
              type: actualQuizType,
              options: actualQuizType === 'CHOICE' && multiLangData.zh.options ? (JSON.stringify(multiLangData.zh.options) as any) : undefined,
            },
          ]
        }
      },
      include: {
        translations: true
      }
    });

    return NextResponse.json({ ...multiLangData.ja, id: savedQuiz.id, imageUrl });

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
