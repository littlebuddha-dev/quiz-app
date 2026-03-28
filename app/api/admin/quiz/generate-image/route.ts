/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const timeoutMs = Number(process.env.QUIZ_IMAGE_TIMEOUT_MS || 12000);
    const categoryName = quiz.category?.nameJa || quiz.category?.name || quiz.categoryId;

    let baseImageUrl = quiz.imageUrl || jaTranslation.imageUrl || '';

    if (!baseImageUrl || force) {
      const basePrompt = `Create exactly one premium educational illustration in a wide 16:9 layout for learners around age ${quiz.targetAge || 8}.
Topic: ${normalizeText(jaTranslation.title) || 'Quiz'}
Subject area: ${categoryName}
Question context: ${normalizeText(jaTranslation.question)}
Visual direction: ${persona.imageStyle}

Requirements:
- The image must help the learner understand the quiz idea at a glance.
- Keep the composition clean, exciting, and age-appropriate.
- Do not include any letters, words, numbers, subtitles, captions, UI, watermark, or logo.
- Use polished lighting and textbook-quality clarity.`;

      const generatedBase = await withTimeout(
        generateNanobananaImage(ai, basePrompt),
        timeoutMs,
        'Base image generation'
      );

      if (!generatedBase?.data) {
        return NextResponse.json({ error: 'Base image generation failed' }, { status: 500 });
      }

      baseImageUrl = await storeImageWithFallback(
        Buffer.from(generatedBase.data, 'base64'),
        generatedBase.mimeType
      );

      await prisma.quiz.update({
        where: { id: quizId },
        data: { imageUrl: baseImageUrl || '' },
      });

      await prisma.quizTranslation.updateMany({
        where: { quizId, locale: 'ja' },
        data: { imageUrl: baseImageUrl },
      });
    }

    if (locale === 'ja') {
      console.log(`[generate-image] success quizId=${quizId} locale=ja`);
      return NextResponse.json({ success: true, imageUrl: baseImageUrl });
    }

    const sourceImage = await resolveInlineImageData(baseImageUrl);
    const localizedPrompt = `Use the attached educational quiz image as the visual source.

Keep the composition, characters, objects, background, lighting, colors, and style as consistent as possible.
Remove the current text and replace it with exactly these two text blocks in ${detectLocaleLanguageName(locale)}:
Headline: "${normalizeText(targetTranslation.title || jaTranslation.title)}"
Support text: "${normalizeText(targetTranslation.question || jaTranslation.question).slice(0, 90)}"
Make the headline visually primary and the support text secondary.
Do not add subtitles, labels, UI, borders, or any extra text.
Return one finished localized image.`;

    const localizedImage = await withTimeout(
      editNanobananaImage(ai, sourceImage, localizedPrompt),
      Math.max(6000, Math.floor(timeoutMs * 0.8)),
      `${locale} localized image generation`
    );

    if (!localizedImage?.data) {
      return NextResponse.json({ error: 'Localized image generation failed' }, { status: 500 });
    }

    const localizedImageUrl = await storeImageWithFallback(
      Buffer.from(localizedImage.data, 'base64'),
      localizedImage.mimeType
    );

    await prisma.quizTranslation.updateMany({
      where: { quizId, locale },
      data: { imageUrl: localizedImageUrl },
    });

    console.log(`[generate-image] success quizId=${quizId} locale=${locale}`);
    return NextResponse.json({ success: true, imageUrl: localizedImageUrl });
  } catch (error: any) {
    console.error('Generate Quiz Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
