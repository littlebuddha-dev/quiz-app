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
type RequestedLocale = QuizLocale | 'all';
const ALL_LOCALES: QuizLocale[] = ['ja', 'en', 'zh'];

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function clampText(value: string, maxLength: number) {
  const trimmed = normalizeText(value);
  if (!trimmed) return '';
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function firstSentence(value: string) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (!normalized) return '';
  const segments = normalized
    .split(/(?<=[。！？!?]|\. )|\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments[0] || normalized;
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

function buildBasePrompt(params: {
  age: number;
  categoryName: string;
  title: string;
  question: string;
  imageStyle: string;
}) {
  const { age, categoryName, title, question, imageStyle } = params;
  return `Create exactly one premium educational illustration in a wide 16:9 layout for learners around age ${age}.
Topic: ${title}
Subject area: ${categoryName}
Question context: ${clampText(firstSentence(question), 90)}
Visual direction: ${imageStyle}

Requirements:
- The image must help the learner understand the quiz idea at a glance.
- Keep the composition clean, exciting, and age-appropriate.
- Do not include any letters, words, numbers, subtitles, captions, UI, watermark, or logo.
- Use polished lighting and textbook-quality clarity.`;
}

function buildLocalizedCopy(params: {
  locale: QuizLocale;
  title: string;
  question: string;
  hint?: string | null;
}) {
  const { locale, title, question, hint } = params;
  const headlineLimit = locale === 'en' ? 42 : 24;
  const supportLimit = locale === 'en' ? 78 : 44;
  const headline = clampText(firstSentence(title), headlineLimit);
  const supportSource = firstSentence(hint || '') || firstSentence(question);
  const support = clampText(supportSource, supportLimit);
  return { headline, support };
}

function buildLocalizedEditPrompt(params: {
  locale: QuizLocale;
  title: string;
  question: string;
  hint?: string | null;
  age: number;
  categoryName: string;
  imageStyle: string;
}) {
  const { locale, title, question, hint, age, categoryName, imageStyle } = params;
  const copy = buildLocalizedCopy({ locale, title, question, hint });
  return `Use the attached educational illustration as the visual base and create one finished localized quiz image for learners around age ${age}.
Subject area: ${categoryName}
Visual direction: ${imageStyle}

Visible text rules:
- Add exactly two text blocks and no others.
- Language: ${detectLocaleLanguageName(locale)} only.
- Headline: "${copy.headline}"
- Support text: "${copy.support}"
- Keep the text blocks short and fully visible. Do not cut off letters or end mid-sentence.
- Headline should fit within two lines. Support text should fit within three short lines.
- Make the headline visually primary and the support text secondary.
- Keep the composition, characters, background, and educational meaning consistent with the source image.
- Do not add subtitles, labels, UI chrome, watermark, or any extra random text.`;
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
      locale?: RequestedLocale;
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
    if (!jaTranslation) {
      return NextResponse.json({ error: 'Quiz translations are incomplete' }, { status: 400 });
    }
    const localesToGenerate = locale === 'all' ? ALL_LOCALES : [locale];
    const translationsByLocale = new Map(quiz.translations.map((entry) => [entry.locale as QuizLocale, entry]));

    const ai = new GoogleGenAI({ apiKey });
    const persona = getPersonaByAge(quiz.targetAge || 8);
    const timeoutMs = Number(process.env.QUIZ_IMAGE_TIMEOUT_MS || 30000);
    const categoryName = quiz.category?.nameJa || quiz.category?.name || quiz.categoryId;
    const existingQuizImageUrl = normalizeText(quiz.imageUrl);
    let baseImageUrl = existingQuizImageUrl;

    if (!baseImageUrl || force) {
      let baseImage = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          baseImage = await withTimeout(
            generateNanobananaImage(
              ai,
              buildBasePrompt({
                age: quiz.targetAge || 8,
                categoryName,
                title: normalizeText(jaTranslation.title) || 'Quiz',
                question: normalizeText(jaTranslation.question),
                imageStyle: persona.imageStyle,
              })
            ),
            timeoutMs,
            'base image generation'
          );
          if (baseImage?.data) break;
        } catch (retryErr: any) {
          console.warn(`[generate-image] base attempt ${attempt + 1} error:`, retryErr.message);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!baseImage?.data) {
        return NextResponse.json({ error: 'Base image generation failed after retries' }, { status: 500 });
      }

      baseImageUrl = await storeImageWithFallback(Buffer.from(baseImage.data, 'base64'), baseImage.mimeType);
      await prisma.quiz.update({
        where: { id: quizId },
        data: { imageUrl: baseImageUrl },
      });
    }

    const generatedImageUrls: Partial<Record<QuizLocale, string>> = {};
    for (const currentLocale of localesToGenerate) {
      const translation = translationsByLocale.get(currentLocale) || jaTranslation;
      if (!translation) continue;

      if (!force && translation.imageUrl) {
        generatedImageUrls[currentLocale] = translation.imageUrl;
        continue;
      }

      const sourceImage = await resolveInlineImageData(baseImageUrl);
      let localizedImage = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          localizedImage = await withTimeout(
            editNanobananaImage(
              ai,
              sourceImage,
              buildLocalizedEditPrompt({
                locale: currentLocale,
                title: normalizeText(translation.title || jaTranslation.title) || 'Quiz',
                question: normalizeText(translation.question || jaTranslation.question),
                hint: normalizeText(translation.hint || jaTranslation.hint),
                age: quiz.targetAge || 8,
                categoryName,
                imageStyle: persona.imageStyle,
              })
            ),
            timeoutMs,
            `${currentLocale} localized image generation`
          );
          if (localizedImage?.data) break;
        } catch (retryErr: any) {
          console.warn(`[generate-image] ${currentLocale} attempt ${attempt + 1} error:`, retryErr.message);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }

      if (!localizedImage?.data) {
        console.warn(`[generate-image] localized generation failed for locale=${currentLocale}, falling back to base image`);
        generatedImageUrls[currentLocale] = baseImageUrl;
      } else {
        generatedImageUrls[currentLocale] = await storeImageWithFallback(
          Buffer.from(localizedImage.data, 'base64'),
          localizedImage.mimeType
        );
      }

      await prisma.quizTranslation.updateMany({
        where: { quizId, locale: currentLocale },
        data: { imageUrl: generatedImageUrls[currentLocale] },
      });
    }

    const primaryLocale = locale === 'all' ? 'ja' : locale;
    console.log(`[generate-image] success quizId=${quizId} locale=${locale}`);
    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrls[primaryLocale] || baseImageUrl,
      imageUrls: generatedImageUrls,
    });
  } catch (error: any) {
    console.error('Generate Quiz Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
