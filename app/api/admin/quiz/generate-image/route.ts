/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: app/api/admin/quiz/generate-image/route.ts
// Title: Deferred Quiz Image Generator API
// Purpose: Generates educational images for existing quizzes using nanobanana (gemini-3.1-flash-image).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import { createDataUrlFromBuffer, storeImageBuffer } from '@/lib/image-storage';
import { resolveInlineImageData } from '@/lib/nanobanana';
import { detectLanguageSubjectRule, getPersonaByAge } from '@/lib/ai-prompts';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/ai-models';
import { GEMINI_PRIMARY_TEXT_MODEL } from '@/lib/ai-models';
import {
  generateAIImage,
  generateAIText,
  hasAIProvider,
  inferAIProvider,
  type AIProviderName,
} from '@/lib/ai-provider';

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

function fitTextForImage(value: string, maxLength: number) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;

  const candidates = [
    normalized.replace(/\s*[（(][^）)]*[）)]\s*/g, ' ').replace(/\s+/g, ' ').trim(),
    normalized.split(/[〜~｜|]/)[0]?.trim() || '',
    normalized.split(/[。.!?！？]/)[0]?.trim() || '',
    normalized.split(/[、，,:：;]/)[0]?.trim() || '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.length <= maxLength) {
      return candidate;
    }
  }

  return normalized.slice(0, maxLength).trim();
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
      return 'Simplified Chinese (Mainland China)';
  }
}

function buildLocaleSpecificTextRule(locale: QuizLocale) {
  if (locale === 'en') {
    return `- Use natural English only, written in the Latin alphabet.
- Do not leave any Japanese or Chinese characters anywhere in the final image.
- Do not place tiny labels, side notes, or extra callouts under objects, arrows, or decorations.
- Keep all visible English text confined to the intended two text blocks only.`;
  }

  if (locale === 'zh') {
    return `- Use only standard Mainland Simplified Chinese characters.
- Never use Traditional Chinese forms such as 學, 習, 說, 圖, 葉, 這, 為, 麼.
- Do not place tiny labels, side notes, or extra callouts under objects, leaves, acorns, arrows, or decorations.
- Keep all visible Chinese text confined to the intended two text blocks only.`;
  }

  return '';
}

function getLocalizedAttemptLimit(locale: QuizLocale) {
  if (locale === 'zh') return 6;
  if (locale === 'en') return 5;
  return 4;
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
- The learner should still roughly understand the problem scenario even if the text is removed, but the result must remain an attractive illustration rather than an infographic.
- Prefer one memorable scene with a few decisive clues over dense explanatory layouts.
- Avoid slide-like compositions, comparison tables, multi-panel summaries, classroom posters, or text-heavy chart structures.
- Make the core entities, relationships, and cues visible enough that the question can be guessed from the image itself.
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
- The learner should be able to infer the logic challenge from the image even if no text is shown.
- Keep it visually rich and scene-based, not like a worksheet or flowchart poster.
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
  const headline = fitTextForImage(firstSentence(title), 28);
  const support = fitTextForImage(firstSentence(hint || '') || firstSentence(question), 60);
  return `Create exactly one premium educational quiz illustration in a wide 16:9 layout for learners around age ${age}.
Subject area: ${categoryName}
Visual direction: ${imageStyle}
Question context: ${clampText(firstSentence(question), 90)}

Visible text rules:
- Add exactly two Japanese text blocks and no others.
- Headline text: "${headline}"
- Support text: "${support}"
- Keep the headline visually primary and the support text secondary.
- Every character of both text blocks must remain visible. Do not crop, truncate, replace with ellipses, or fade out any letters.
- If the text feels long, reduce font size moderately and tighten line breaks so everything fits cleanly.
- Headline should fit within up to three compact lines. Support text should fit within up to four compact lines.

Image rules:
- The composition must help the learner understand the quiz idea at a glance.
- Even without reading the Japanese text, the learner should roughly understand the phenomenon, relationship, sequence, or comparison shown in the quiz.
- Make the visual clues do the heavy lifting; text should only reinforce the idea, not carry it alone.
- Keep the total text presence minimal and leave most of the canvas to the illustration itself.
- Avoid flowchart grids, comparison cards, timeline boxes, and layouts that read like a classroom slide.
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
  const headline = fitTextForImage(headlineSource, subjectLocale === 'en' ? 48 : 28);
  const support = fitTextForImage(supportSource, locale === 'en' ? 96 : 60);
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
  const localeSpecificTextRule = buildLocaleSpecificTextRule(locale);

  return `Edit this educational illustration into a polished localized quiz image for learners around age ${age}.
Subject area: ${categoryName}
Visual direction: ${imageStyle}

Visible text rules:
- Add exactly two text blocks and no others.
- ${localeRule}
- ${localeSpecificTextRule || 'Keep the typography clean and limited to the intended two text blocks.'}
- Headline text: "${copy.headline}"
- Support text: "${copy.support}"
- Replace only the existing Japanese quiz text blocks with the localized text above.
- If any original Japanese text remains anywhere in the final image, the attempt is invalid.
- Preserve the layout, object placement, framing, camera angle, colors, and diagram structure as much as possible.
- Do not move or redesign the composition unless it is necessary to fit the replacement text cleanly.
- Keep the visible text exactly as written, with the same wording and punctuation.
- Make the headline visually primary and the support text secondary.
- Every character of both text blocks must remain visible. Do not crop, truncate, replace with ellipses, or fade out any letters.
- If the text feels long, reduce font size moderately and tighten line breaks so everything fits cleanly.
- Headline should fit within up to three compact lines. Support text should fit within up to four compact lines.
- Keep the composition, objects, and educational meaning consistent with the source image.
- No subtitles, no labels, no chart annotations, no UI chrome, no watermark, and no additional random text.`;
}

type ImageValidationResult = {
  ok: boolean;
  issues: string[];
};

async function validateLocalizedImage(params: {
  image: { data: string; mimeType: string };
  locale: QuizLocale;
  subjectLocale: QuizLocale;
  isLanguageSubject: boolean;
  expectedHeadline: string;
  expectedSupport: string;
  provider: AIProviderName;
  textModel: string;
  env?: Record<string, unknown>;
}) {
  const { image, locale, subjectLocale, isLanguageSubject, expectedHeadline, expectedSupport, provider, textModel, env } = params;
  const validationPrompt = isLanguageSubject
    ? `Inspect this quiz image and answer in JSON.
Rules:
- Only two meaningful text blocks should be visible.
- The headline must be only in ${detectLocaleLanguageName(subjectLocale)}.
- The support text must be only in ${detectLocaleLanguageName(locale)}.
- The headline text must exactly be: "${expectedHeadline}"
- The support text must exactly be: "${expectedSupport}"
- No other labels, annotations, or mixed-language text should appear.
- No original Japanese text should remain anywhere unless the subject language itself is Japanese.
- Text must not be cut off or incomplete.
- For English, any visible Japanese or Chinese characters are invalid, and decorative object labels also count as extra text.
- For Simplified Chinese, traditional characters are invalid and decorative object labels also count as extra text.
Return exactly:
{"ok":true|false,"issues":["..."]}`
    : `Inspect this quiz image and answer in JSON.
Rules:
- All visible text must be only in ${detectLocaleLanguageName(locale)}.
- The headline text must exactly be: "${expectedHeadline}"
- The support text must exactly be: "${expectedSupport}"
- No other languages or mixed scripts should appear.
- No original Japanese text should remain anywhere in the image.
- Text must not be cut off or incomplete.
- No extra labels or annotations should appear besides the intended title and support text.
- For English, any visible Japanese or Chinese characters are invalid, and decorative object labels also count as extra text.
- For Simplified Chinese, traditional characters are invalid and decorative object labels also count as extra text.
Return exactly:
{"ok":true|false,"issues":["..."]}`;

  const validationModel = provider === 'openai' ? textModel : GEMINI_PRIMARY_TEXT_MODEL;
  const response = await generateAIText({
    model: validationModel,
    prompt: validationPrompt,
    image,
    systemInstruction: 'Return only valid JSON.',
    env,
  });

  try {
    const raw = response.text || '{}';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw) as Partial<ImageValidationResult>;
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

    const { quizId, locale = 'ja', force = false, modelId = DEFAULT_MODEL_ID } = (await req.json()) as {
      quizId?: string;
      locale?: RequestedLocale;
      force?: boolean;
      modelId?: string;
    };

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quizId' }, { status: 400 });
    }

    console.log(`[generate-image] start quizId=${quizId} locale=${locale} force=${force}`);

    const runtimeEnv = env as unknown as Record<string, unknown>;
    const selectedModel = getModelById(modelId);
    let provider = modelId.startsWith('hybrid-')
      ? selectedModel.provider
      : inferAIProvider(modelId);
    if (!hasAIProvider(provider, runtimeEnv)) {
      const fallbackProvider: AIProviderName = provider === 'openai' ? 'gemini' : 'openai';
      if (!hasAIProvider(fallbackProvider, runtimeEnv)) {
        return NextResponse.json({ error: 'No image provider API key is configured' }, { status: 500 });
      }
      provider = fallbackProvider;
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

    const imageModel = selectedModel.provider === provider ? selectedModel.imageModelId : undefined;
    const validationTextModel = selectedModel.provider === provider
      ? selectedModel.generatorId
      : (provider === 'openai' ? 'gpt-5.4-mini' : GEMINI_PRIMARY_TEXT_MODEL);
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
            generateAIImage({
              provider,
              model: imageModel,
              prompt: buildJapaneseMasterPrompt({
                age: quiz.targetAge || 8,
                categoryName,
                title: normalizeText(jaTranslation.title) || 'Quiz',
                question: normalizeText(jaTranslation.question),
                hint: normalizeText(jaTranslation.hint),
                imageStyle: persona.imageStyle,
              }),
              env: runtimeEnv,
            }),
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
            generateAIImage({
              provider,
              model: imageModel,
              prompt: buildProgrammingFallbackPrompt({
                age: quiz.targetAge || 8,
                categoryName,
                title: normalizeText(jaTranslation.title) || 'Programming Quiz',
                question: normalizeText(jaTranslation.question),
                imageStyle: persona.imageStyle,
              }),
              env: runtimeEnv,
            }),
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
      const localizedCopy = buildLocalizedCopy({
        locale: currentLocale,
        subjectLocale: languageSubjectRule?.subjectLocale || 'ja',
        isLanguageSubject: Boolean(languageSubjectRule),
        title: normalizeText(translation.title || jaTranslation.title) || 'Quiz',
        question: normalizeText(translation.question || jaTranslation.question),
        hint: normalizeText(translation.hint || jaTranslation.hint),
        sharedQuestionText,
      });

      const alternateProvider: AIProviderName = provider === 'openai' ? 'gemini' : 'openai';
      const allowAlternateProviderRetry = (currentLocale === 'en' || currentLocale === 'zh')
        && hasAIProvider(alternateProvider, runtimeEnv);
      const providerCandidates = allowAlternateProviderRetry
        ? Array.from(new Set([provider, alternateProvider]))
        : [provider];

      for (const currentProvider of providerCandidates) {
        const currentImageModel = selectedModel.provider === currentProvider ? selectedModel.imageModelId : undefined;
        const currentValidationTextModel = selectedModel.provider === currentProvider
          ? selectedModel.generatorId
          : (currentProvider === 'openai' ? 'gpt-5.4-mini' : GEMINI_PRIMARY_TEXT_MODEL);

        for (let attempt = 0; attempt < getLocalizedAttemptLimit(currentLocale); attempt += 1) {
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
              generateAIImage({
                provider: currentProvider,
                model: currentImageModel,
                sourceImage,
                prompt,
                env: runtimeEnv,
              }),
              timeoutMs,
              `${currentLocale} localized image generation`
            );
            if (!localizedImage?.data) {
              validationIssues = ['no image data was returned'];
              continue;
            }

            const validation = await withTimeout(
              validateLocalizedImage({
                image: localizedImage,
                locale: currentLocale,
                subjectLocale: languageSubjectRule?.subjectLocale || 'ja',
                isLanguageSubject: Boolean(languageSubjectRule),
                expectedHeadline: localizedCopy.headline,
                expectedSupport: localizedCopy.support,
                provider: currentProvider,
                textModel: currentValidationTextModel,
                env: runtimeEnv,
              }),
              Math.max(8000, Math.floor(timeoutMs * 0.5)),
              `${currentLocale} image validation`
            );

            if (validation.ok) {
              break;
            }

            validationIssues = validation.issues.length > 0 ? validation.issues : ['mixed or truncated text was detected'];
            console.warn(`[generate-image] validation failed locale=${currentLocale} provider=${currentProvider} attempt=${attempt + 1}:`, validationIssues);
            localizedImage = null;
          } catch (retryErr: any) {
            validationIssues = [retryErr.message || 'generation failed'];
            console.warn(`[generate-image] ${currentLocale} provider=${currentProvider} attempt ${attempt + 1} error:`, retryErr.message);
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        }

        if (localizedImage?.data) {
          break;
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
