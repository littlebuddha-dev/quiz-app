/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/quiz/generate-image/route.ts
// Title: Deferred Quiz Image Generator API
// Purpose: Generates educational images for existing quizzes using nanobanana (gemini-3.1-flash-image-preview).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenAI } from '@google/genai';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { createDataUrlFromBuffer, storeImageBuffer } from '@/lib/image-storage';
import { editNanobananaImage, generateNanobananaImage, resolveInlineImageData } from '@/lib/nanobanana';
import { getPersonaByAge } from '@/lib/ai-prompts';

type QuizLocale = 'ja' | 'en' | 'zh';

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function storeImageWithFallback(buffer: Buffer, mimeType: string) {
  try {
    const stored = await storeImageBuffer(buffer, mimeType);
    return stored.publicPath;
  } catch (error) {
    console.warn('Managed image storage failed. Using inline fallback.', error);
    return createDataUrlFromBuffer(buffer, mimeType);
  }
}

function detectLocaleLanguageName(locale: QuizLocale) {
  switch (locale) {
    case 'ja':
      return 'Japanese';
    case 'en':
      return 'English';
    case 'zh':
      return 'Simplified Chinese';
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PARENT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { quizId, locale = 'ja', force = false } = (await req.json()) as {
      quizId?: string;
      locale?: QuizLocale;
      force?: boolean;
    };

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quizId' }, { status: 400 });
    }

    console.log(`[generate-image] start quizId=${quizId} locale=${locale} force=${force}`);

    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameJa: true,
          },
        },
        translations: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const jaTranslation = quiz.translations.find((entry) => entry.locale === 'ja');
    const targetTranslation = quiz.translations.find((entry) => entry.locale === locale) || jaTranslation;
    if (!jaTranslation || !targetTranslation) {
      return NextResponse.json({ error: 'Quiz translations are incomplete' }, { status: 400 });
    }

    if (!force && targetTranslation.imageUrl) {
      console.log(`[generate-image] skipped existing image quizId=${quizId} locale=${locale}`);
      return NextResponse.json({ success: true, imageUrl: targetTranslation.imageUrl, skipped: true });
    }

    const ai = new GoogleGenAI({ apiKey });
    const persona = getPersonaByAge(quiz.targetAge || 8);
    const timeoutMs = Number(process.env.QUIZ_IMAGE_TIMEOUT_MS || 30000);
    const categoryName = quiz.category?.nameJa || quiz.category?.name || quiz.categoryId;

    let currentImageUrl = targetTranslation.imageUrl || '';

    if (!currentImageUrl || force) {
      const promptTitle = normalizeText(targetTranslation.title || jaTranslation.title) || 'Quiz';
      const promptQuestion = normalizeText(targetTranslation.question || jaTranslation.question).slice(0, 90);
      const isJapanese = locale === 'ja';

      const prompt = `Create exactly one premium educational illustration in a wide 16:9 layout for learners around age ${quiz.targetAge || 8}.
Topic: ${promptTitle}
Subject area: ${categoryName}
Question context: ${promptQuestion}
Visual direction: ${persona.imageStyle}

Requirements:
- The image must help the learner understand the quiz idea at a glance.
- Keep the composition clean, exciting, and age-appropriate.
- IMPORTANT: Include the following two text blocks seamlessly integrated into the image in ${detectLocaleLanguageName(locale)}:
  Headline: "${promptTitle}"
  Support text: "${promptQuestion}"
- Make the headline visually primary and the support text secondary.
- Do not add any OTHER subtitles, labels, UI, borders, or extra random text.
- Use polished lighting and textbook-quality clarity.`;

      // 画像生成（最大2回リトライ）
      let generatedImage = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          generatedImage = await withTimeout(
            generateNanobananaImage(ai, prompt),
            timeoutMs,
            `${locale} image generation`
          );
          if (generatedImage?.data) break;
          console.warn(`[generate-image] attempt ${attempt + 1} returned no data, retrying...`);
        } catch (retryErr: any) {
          console.warn(`[generate-image] attempt ${attempt + 1} error:`, retryErr.message);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!generatedImage?.data) {
        return NextResponse.json({ error: 'Image generation failed after retries' }, { status: 500 });
      }

      currentImageUrl = await storeImageWithFallback(
        Buffer.from(generatedImage.data, 'base64'),
        generatedImage.mimeType
      );

      // 指定されたロケールの翻訳データに画像をセット
      await prisma.quizTranslation.updateMany({
        where: { quizId, locale },
        data: { imageUrl: currentImageUrl },
      });

      // もしクイズ本体の共通画像がまだ空か、今回が日本語生成だった場合は、クイズ本体と、まだ画像がない他ロケールにも共通画像として一旦セットしておく（画像無しを防ぐため）
      if (!quiz.imageUrl || isJapanese) {
        await prisma.quiz.update({
          where: { id: quizId },
          data: { imageUrl: currentImageUrl },
        });

        const missingLocales = quiz.translations
          .filter(t => !t.imageUrl && t.locale !== locale)
          .map(t => t.locale);
        
        if (missingLocales.length > 0) {
          await prisma.quizTranslation.updateMany({
            where: { quizId, locale: { in: missingLocales } },
            data: { imageUrl: currentImageUrl },
          });
        }
      }
    }

    console.log(`[generate-image] success quizId=${quizId} locale=${locale}`);
    return NextResponse.json({ success: true, imageUrl: currentImageUrl });
  } catch (error: any) {
    console.error('Generate Quiz Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
