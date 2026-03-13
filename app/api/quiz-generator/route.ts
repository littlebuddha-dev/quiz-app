// Path: app/api/quiz-generator/route.ts
// Title: Quiz Generator API Route
// Purpose: Generates quiz text and illustration using Google Gen AI based on topic, grade level, and language.

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { topic, gradeLevel, systemPrompt, correctionPrompt } = await req.json();

    const DEFAULT_SYSTEM_INSTRUCTION = `
あなたは「学ぶことの楽しさを伝える」教育コンテンツクリエイターです。
小学生から大学受験レベルまで、幅広い層に向けた高品質な学習クイズを作成します。
ユーザーの指定する「トピック」と「学年レベル」に基づき、「問題文」「ヒント」「答え」を作成してください。

## 数式の扱い
* **重要**: 数学や物理などの数式が含まれる場合は、必ず LaTeX 形式（インラインは $...$, ブロックは $$...$$）を使用してください。
* 例: 二次方程式の解は $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ です。

## レベル別ガイドライン
* **小学生（1-6）**: 直感的でわかりやすい言葉を使い、知的好奇心を刺激します。
* **中学生（7-9）**: 高校入試を視野に入れた、基礎から応用までの論理的思考を問います。
* **高校生（10-12）**: 大学入試レベルの高度な定義・定理解説を含め、深い理解を促します。
* **大学生・一般（13+）**: 専門的な内容（微分積分、線形代数、高度な歴史背景など）を正確に扱います。

## 制約事項
* 出力は必ず「日本語(ja)」「英語(en)」「中国語(zh)」の3言語すべて含めてください。
* 画像生成用にも使われるため、問題文は要点を絞って端潔に記述してください。

## 出力フォーマット
{
  "ja": { "title": "...", "question": "...", "hint": "...", "answer": "..." },
  "en": { "title": "...", "question": "...", "hint": "...", "answer": "..." },
  "zh": { "title": "...", "question": "...", "hint": "...", "answer": "..." }
}
`;

    const finalSystemInstruction = systemPrompt || DEFAULT_SYSTEM_INSTRUCTION;

    let textPrompt = `学年: ${gradeLevel}, テーマ: ${topic} で、クイズを3言語(日・英・中)で作成してください。\n${finalSystemInstruction}`;
    if (correctionPrompt) {
      textPrompt += `\n\n## ユーザーからの追加指示（補正）:\n${correctionPrompt}`;
    }

    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: textPrompt,
      config: { responseMimeType: "application/json" },
    });

    const generatedText = textResponse.text;
    if (!generatedText) {
      throw new Error("Failed to generate text content.");
    }
    const multiLangData = JSON.parse(generatedText);

    // 画像生成用のプロンプト (日本語をベースにする)
    const imageCommand = `Create a whimsical, storybook-style illustration of a fantasy world with themes of ${topic}. The main focus should be the following text written in a cute, legible font, neatly laid out: "${multiLangData.ja.question}". The illustration should be simple and delightful, supporting the text's message. Ensure there are no other words.`;

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

    const parsedAge = parseInt(gradeLevel) || 8;
    const { prisma } = await import('@/lib/prisma');

    // 3言語すべての翻訳を一度に保存
    const savedQuiz = await prisma.quiz.create({
      data: {
        categoryId: topic,
        targetAge: parsedAge,
        imageUrl: imageUrl,
        translations: {
          create: [
            {
              locale: 'ja',
              title: multiLangData.ja.title,
              question: multiLangData.ja.question,
              hint: multiLangData.ja.hint,
              answer: multiLangData.ja.answer,
              type: 'TEXT',
            },
            {
              locale: 'en',
              title: multiLangData.en.title,
              question: multiLangData.en.question,
              hint: multiLangData.en.hint,
              answer: multiLangData.en.answer,
              type: 'TEXT',
            },
            {
              locale: 'zh',
              title: multiLangData.zh.title,
              question: multiLangData.zh.question,
              hint: multiLangData.zh.hint,
              answer: multiLangData.zh.answer,
              type: 'TEXT',
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

    // レート制限エラー (429) のハンドリング
    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: 'AIの利用制限に達しました。1分ほど待ってから再度お試しください。' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: 'Failed to generate quiz', message: 'クイズの生成中にエラーが発生しました。' }, { status: 500 });
  }
}