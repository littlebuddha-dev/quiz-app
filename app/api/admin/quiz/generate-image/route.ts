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
import { detectLanguageSubjectRule, getPersonaByAge } from '@/lib/ai-prompts';

type QuizLocale = 'ja' | 'en' | 'zh';
type RequestedLocale = QuizLocale | 'all';
const ALL_LOCALES: QuizLocale[] = ['ja', 'en', 'zh'];
type LocaleGenerationStatus = 'generated' | 'existing' | 'fallback_ja' | 'missing_translation';
const PROGRAMMING_SUBJECT_ALIASES = [
  'プログラミング',
  'programming',
  'coding',
  'code',
  '情報',
  'information',
  'informatics',
  'computer science',
];

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGeneratedImageUrl(value: unknown) {
  const normalized = normalizeText(value);
  return normalized === '/images/no-image.png' ? '' : normalized;
}

function normalizeCategoryName(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').trim();
}

function detectProgrammingSubject(categoryNames: Array<string | null | undefined>) {
  const normalizedNames = categoryNames
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .map(normalizeCategoryName);

  return PROGRAMMING_SUBJECT_ALIASES.some((alias) =>
    normalizedNames.some((name) => name.includes(normalizeCategoryName(alias)))
  );
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

function extractExerciseText(question: string) {
  const trimmed = question.trim();
  const quotedAnywhere = trimmed.match(/[「『“"][\s\S]+?[」』”"]/);
  if (quotedAnywhere?.[0]) {
    return quotedAnywhere[0].trim();
  }

  const firstLine = trimmed.split('\n')[0]?.trim();
  if (!firstLine) return '';

  const colonSeparated = firstLine.match(/^[^:：]+[:：]\s*(.+)$/);
  if (colonSeparated?.[1]) {
    return colonSeparated[1].trim();
  }

  return firstLine.length <= 120 ? firstLine : '';
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

function buildProgrammingFallbackPrompt(params: {
  age: number;
  categoryName: string;
  title: string;
  question: string;
  imageStyle: string;
}) {
  const { age, categoryName, title, question, imageStyle } = params;
  return `Create exactly one premium educational programming illustration in a wide 16:9 layout for learners around age ${age}.
Topic: ${title}
Subject area: ${categoryName}
Programming concept: ${clampText(firstSentence(question), 90)}
Visual direction: ${imageStyle}

Requirements:
- Show sequence, branching, repetition, shortest path, or step-by-step logic using arrows, cards, blocks, paths, robots, icons, or highlighted steps.
- Keep it as a concept illustration, not a screenshot.
- Do not include any letters, words, numbers, subtitles, captions, UI, watermark, or logo.
- Make the logic easy to grasp at a glance with polished lighting and textbook-quality clarity.`;
}

function buildJapaneseMasterPrompt(params: {
  age: number;
  categoryName: string;
  title: string;
  question: string;
  hint?: string | null;
  imageStyle: string;
}) {
  const { age, categoryName, title, question, hint, imageStyle } = params;
  const headline = clampText(firstSentence(title), 24);
  const support = clampText(firstSentence(hint || '') || firstSentence(question), 44);
  return `Create exactly one premium educational quiz illustration in a wide 16:9 layout for learners around age ${age}.
Subject area: ${categoryName}
Visual direction: ${imageStyle}
Question context: ${clampText(firstSentence(question), 90)}

Visible text rules:
- Add exactly two Japanese text blocks and no others.
- Headline text: "${headline}"
- Support text: "${support}"
- Keep the headline visually primary and the support text secondary.
- Keep all text fully visible. Do not crop, truncate, or fade out any letters.
- Headline should fit within two lines. Support text should fit within three short lines.

Image rules:
- The composition must help the learner understand the quiz idea at a glance.
- Keep the composition clean, exciting, and age-appropriate.
- Do not add any extra labels, annotations, chart text, UI chrome, watermark, or logo.
- Use polished lighting and textbook-quality clarity.`;
}

function buildLocalizedCopy(params: {
  locale: QuizLocale;
  subjectLocale: QuizLocale;
  isLanguageSubject: boolean;
  title: string;
  question: string;
  hint?: string | null;
  sharedQuestionText?: string;
}) {
  const { locale, subjectLocale, isLanguageSubject, title, question, hint, sharedQuestionText } = params;
  const headlineLimit = locale === 'en' ? 42 : 24;
  const supportLimit = locale === 'en' ? 78 : 44;
  const headlineSource = isLanguageSubject
    ? (sharedQuestionText || firstSentence(title))
    : firstSentence(title);
  const supportSource = isLanguageSubject
    ? normalizeText(question.replace(sharedQuestionText || '', '')) || firstSentence(hint || '') || firstSentence(question)
    : (firstSentence(hint || '') || firstSentence(question));
  const headline = clampText(headlineSource, subjectLocale === 'en' ? 42 : 24);
  const support = clampText(supportSource, supportLimit);
  return { headline, support };
}

function buildLocalizedEditPrompt(params: {
  locale: QuizLocale;
  subjectLocale: QuizLocale;
  isLanguageSubject: boolean;
  title: string;
  question: string;
  hint?: string | null;
  sharedQuestionText?: string;
  age: number;
  categoryName: string;
  imageStyle: string;
}) {
  const { locale, subjectLocale, isLanguageSubject, title, question, hint, sharedQuestionText, age, categoryName, imageStyle } = params;
  const copy = buildLocalizedCopy({
    locale,
    subjectLocale,
    isLanguageSubject,
    title,
    question,
    hint,
    sharedQuestionText,
  });
  const localeRule = isLanguageSubject
    ? `Only two text blocks are allowed. The headline must be strictly in ${detectLocaleLanguageName(subjectLocale)}. The support text must be strictly in ${detectLocaleLanguageName(locale)}. Do not mix other scripts or add any extra labels elsewhere.`
    : `All visible text must be strictly in ${detectLocaleLanguageName(locale)} only. Do not mix scripts, and do not add any other language anywhere in the image.`;

  return `Edit this educational illustration into a polished localized quiz image for learners around age ${age}.
Subject area: ${categoryName}
Visual direction: ${imageStyle}

Visible text rules:
- Add exactly two text blocks and no others.
- ${localeRule}
- Headline text: "${copy.headline}"
- Support text: "${copy.support}"
- Replace only the existing Japanese quiz text blocks with the localized text above.
- Preserve the layout, object placement, framing, camera angle, colors, and diagram structure as much as possible.
- Do not move or redesign the composition unless it is necessary to fit the replacement text cleanly.
- Keep the visible text exactly as written, with the same wording and punctuation.
- Make the headline visually primary and the support text secondary.
- Keep all text fully visible. Do not crop, truncate, or fade out any letters.
- Headline should fit within two lines. Support text should fit within three short lines.
- Keep the composition, objects, and educational meaning consistent with the source image.
- No subtitles, no labels, no chart annotations, no UI chrome, no watermark, and no additional random text.`;
}

type ImageValidationResult = {
  ok: boolean;
  issues: string[];
};

async function validateLocalizedImage(params: {
  ai: GoogleGenAI;
  image: { data: string; mimeType: string };
  locale: QuizLocale;
  subjectLocale: QuizLocale;
  isLanguageSubject: boolean;
}) {
  const { ai, image, locale, subjectLocale, isLanguageSubject } = params;
  const validationPrompt = isLanguageSubject
    ? `Inspect this quiz image and answer in JSON.
Rules:
- Only two meaningful text blocks should be visible.
- The headline must be only in ${detectLocaleLanguageName(subjectLocale)}.
- The support text must be only in ${detectLocaleLanguageName(locale)}.
- No other labels, annotations, or mixed-language text should appear.
- Text must not be cut off or incomplete.
Return exactly:
{"ok":true|false,"issues":["..."]}`
    : `Inspect this quiz image and answer in JSON.
Rules:
- All visible text must be only in ${detectLocaleLanguageName(locale)}.
- No other languages or mixed scripts should appear.
- Text must not be cut off or incomplete.
- No extra labels or annotations should appear besides the intended title and support text.
Return exactly:
{"ok":true|false,"issues":["..."]}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: image.data,
              mimeType: image.mimeType,
            },
          },
          { text: validationPrompt },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}') as Partial<ImageValidationResult>;
    return {
      ok: Boolean(parsed.ok),
      issues: Array.isArray(parsed.issues) ? parsed.issues.filter((issue): issue is string => typeof issue === 'string') : [],
    };
  } catch (error) {
    console.warn('[generate-image] validation parse failed:', error);
    return {
      ok: false,
      issues: ['validation response could not be parsed'],
    };
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
    const isProgrammingSubject = detectProgrammingSubject([
      quiz.category?.name,
      quiz.category?.nameJa,
      quiz.categoryId,
    ]);
    const languageSubjectRule = detectLanguageSubjectRule([
      quiz.category?.name,
      quiz.category?.nameJa,
      quiz.categoryId,
    ]);
    const jaExistingImageUrl = normalizeGeneratedImageUrl(jaTranslation.imageUrl || quiz.imageUrl);
    let masterJaImageUrl = jaExistingImageUrl;

    if (!masterJaImageUrl || force) {
      let masterJaImage = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          masterJaImage = await withTimeout(
            generateNanobananaImage(
              ai,
              buildJapaneseMasterPrompt({
                age: quiz.targetAge || 8,
                categoryName,
                title: normalizeText(jaTranslation.title) || 'Quiz',
                question: normalizeText(jaTranslation.question),
                hint: normalizeText(jaTranslation.hint),
                imageStyle: persona.imageStyle,
              })
            ),
            timeoutMs,
            'ja master image generation'
          );
          if (masterJaImage?.data) break;
        } catch (retryErr: any) {
          console.warn(`[generate-image] ja master attempt ${attempt + 1} error:`, retryErr.message);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!masterJaImage?.data && isProgrammingSubject) {
        try {
          masterJaImage = await withTimeout(
            generateNanobananaImage(
              ai,
              buildProgrammingFallbackPrompt({
                age: quiz.targetAge || 8,
                categoryName,
                title: normalizeText(jaTranslation.title) || 'Programming Quiz',
                question: normalizeText(jaTranslation.question),
                imageStyle: persona.imageStyle,
              })
            ),
            Math.max(8000, Math.floor(timeoutMs * 0.8)),
            'ja programming fallback image generation'
          );
        } catch (fallbackError: any) {
          console.warn('[generate-image] programming fallback master image failed:', fallbackError.message);
        }
      }

      if (!masterJaImage?.data) {
        return NextResponse.json({ error: 'Japanese master image generation failed after retries' }, { status: 500 });
      }

      masterJaImageUrl = await storeImageWithFallback(Buffer.from(masterJaImage.data, 'base64'), masterJaImage.mimeType);
      await prisma.quiz.update({
        where: { id: quizId },
        data: { imageUrl: masterJaImageUrl },
      });
      await prisma.quizTranslation.updateMany({
        where: { quizId, locale: 'ja' },
        data: { imageUrl: masterJaImageUrl },
      });
    }

    const generatedImageUrls: Partial<Record<QuizLocale, string>> = {};
    const localeResults: Partial<Record<QuizLocale, { status: LocaleGenerationStatus; imageUrl: string; issues?: string[] }>> = {};
    const sharedQuestionText = languageSubjectRule ? extractExerciseText(normalizeText(jaTranslation.question)) : '';
    for (const currentLocale of localesToGenerate) {
      const translation = translationsByLocale.get(currentLocale) || jaTranslation;
      if (!translation) {
        localeResults[currentLocale] = {
          status: 'missing_translation',
          imageUrl: masterJaImageUrl,
          issues: ['translation record was not found'],
        };
        continue;
      }

      if (currentLocale === 'ja') {
        generatedImageUrls.ja = masterJaImageUrl;
        const hasExistingJaImage = Boolean(normalizeGeneratedImageUrl(translation.imageUrl));
        localeResults.ja = {
          status: force || !hasExistingJaImage ? 'generated' : 'existing',
          imageUrl: masterJaImageUrl,
        };
        if (!force && hasExistingJaImage) {
          continue;
        }
        await prisma.quizTranslation.updateMany({
          where: { quizId, locale: 'ja' },
          data: { imageUrl: masterJaImageUrl },
        });
        continue;
      }

      const existingLocalizedImageUrl = normalizeGeneratedImageUrl(translation.imageUrl);
      if (!force && existingLocalizedImageUrl) {
        generatedImageUrls[currentLocale] = existingLocalizedImageUrl;
        localeResults[currentLocale] = {
          status: 'existing',
          imageUrl: existingLocalizedImageUrl,
        };
        continue;
      }

      const sourceImage = await resolveInlineImageData(masterJaImageUrl);
      let localizedImage = null;
      let validationIssues: string[] = [];

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const prompt = `${buildLocalizedEditPrompt({
          locale: currentLocale,
          subjectLocale: languageSubjectRule?.subjectLocale || 'ja',
          isLanguageSubject: Boolean(languageSubjectRule),
          title: normalizeText(translation.title || jaTranslation.title) || 'Quiz',
          question: normalizeText(translation.question || jaTranslation.question),
          hint: normalizeText(translation.hint || jaTranslation.hint),
          sharedQuestionText,
          age: quiz.targetAge || 8,
          categoryName,
          imageStyle: persona.imageStyle,
        })}${validationIssues.length > 0 ? `\n\nFix these problems from the previous attempt:\n- ${validationIssues.join('\n- ')}` : ''}`;

        try {
          localizedImage = await withTimeout(
            editNanobananaImage(ai, sourceImage, prompt),
            timeoutMs,
            `${currentLocale} localized image generation`
          );
          if (!localizedImage?.data) {
            validationIssues = ['no image data was returned'];
            continue;
          }

          const validation = await withTimeout(
            validateLocalizedImage({
              ai,
              image: localizedImage,
              locale: currentLocale,
              subjectLocale: languageSubjectRule?.subjectLocale || 'ja',
              isLanguageSubject: Boolean(languageSubjectRule),
            }),
            Math.max(8000, Math.floor(timeoutMs * 0.5)),
            `${currentLocale} image validation`
          );

          if (validation.ok) {
            break;
          }

          validationIssues = validation.issues.length > 0 ? validation.issues : ['mixed or truncated text was detected'];
          console.warn(`[generate-image] validation failed locale=${currentLocale} attempt=${attempt + 1}:`, validationIssues);
          localizedImage = null;
        } catch (retryErr: any) {
          validationIssues = [retryErr.message || 'generation failed'];
          console.warn(`[generate-image] ${currentLocale} attempt ${attempt + 1} error:`, retryErr.message);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }

      if (!localizedImage?.data) {
        console.warn(`[generate-image] localized generation failed for locale=${currentLocale}, falling back to japanese master image`);
        generatedImageUrls[currentLocale] = masterJaImageUrl;
        localeResults[currentLocale] = {
          status: 'fallback_ja',
          imageUrl: masterJaImageUrl,
          issues: validationIssues,
        };
      } else {
        generatedImageUrls[currentLocale] = await storeImageWithFallback(
          Buffer.from(localizedImage.data, 'base64'),
          localizedImage.mimeType
        );
        localeResults[currentLocale] = {
          status: 'generated',
          imageUrl: generatedImageUrls[currentLocale],
        };
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
      imageUrl: generatedImageUrls[primaryLocale] || masterJaImageUrl,
      imageUrls: generatedImageUrls,
      localeResults,
    });
  } catch (error: any) {
    console.error('Generate Quiz Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
