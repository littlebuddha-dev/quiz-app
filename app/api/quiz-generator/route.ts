// Path: app/api/quiz-generator/route.ts
// Title: Quiz Generator API Route
// Purpose: Generates quiz text and illustration using Google Gen AI based on topic, grade level, and language.

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { topic, gradeLevel, locale } = await req.json();

    // 多言語対応の言語指定
    const languageMap: Record<string, string> = {
      ja: '日本語',
      en: '英語',
      zh: '中国語'
    };
    const targetLanguage = languageMap[locale] || '日本語';

    const SYSTEM_INSTRUCTION_TEXT = `
    あなたは「小学生向けの楽しい論理的思考」をテーマにした、SNSコンテンツクリエイターです。
    言語は必ず「${targetLanguage}」で出力してください。
    ユーザーの要望に基づき、論理的思考力を養う「問題文」「ヒント」「答え」を作成し、以下のフォーマットのJSONで出力してください。

    ## 問題作成の制約事項
    * **文字数制限**: 画像内に配置するため「3行以内」かつ「60文字以内」に必ず収めること。
    * **テーマ**: ${topic}

    ## 出力フォーマット
    {
      "question": "（画像に入れるテキスト：60文字・3行以内）",
      "hint": "（考え方の指針を示すテキスト：120文字以内）",
      "answer": "（正解の数字と、簡単な論理：120文字以内）"
    }
    `;

    const textPrompt = `学年: ${gradeLevel}, テーマ: ${topic} で、クイズを作成してください。\n${SYSTEM_INSTRUCTION_TEXT}`;
    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: textPrompt,
      config: { responseMimeType: "application/json" },
    });

    const generatedText = textResponse.text;
    if (!generatedText) {
      throw new Error("Failed to generate text content.");
    }
    const quizData = JSON.parse(generatedText);

    const imageCommand = `Create a whimsical, storybook-style illustration of a fantasy world with themes of ${topic}. The main focus should be the following text written in a cute, legible font, neatly laid out: "${quizData.question}". The illustration should be simple and delightful, supporting the text's message. Ensure there are no other words.`;

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
        throw new Error("Failed to generate image content.");
    }
    const imageUrl = `data:image/jpeg;base64,${generatedImage}`;

    // Prismaを利用してデータベースに保存
    // Categoryは簡易的に "Generated" または topic を指定、TargetAgeは gradeLevel をパース
    const parsedAge = parseInt(gradeLevel) || 8;
    
    // Prismaインスタンスをインポートして使用
    const { prisma } = await import('@/lib/prisma');
    
    const savedQuiz = await prisma.quiz.create({
      data: {
        categoryId: topic, // 仮としてトピック自体をカテゴリIDに
        targetAge: parsedAge,
        imageUrl: imageUrl,
        translations: {
          create: {
            locale: locale,
            title: `${topic}の問題`,
            question: quizData.question,
            hint: quizData.hint,
            answer: quizData.answer,
            type: 'TEXT', // GenAI生成はデフォルトTEXT型とする
          }
        }
      },
      include: {
        translations: true
      }
    });

    return NextResponse.json({ ...quizData, id: savedQuiz.id, imageUrl });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}