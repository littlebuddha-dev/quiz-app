/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: lib/nanobanana.ts
// Title: Nanobanana Image Generation Helper
// Purpose: Wraps Google Gen AI SDK for educational quiz image generation and editing.

import { GoogleGenAI } from '@google/genai';
import { readImageUrlAsBase64 } from './image-storage';

export const NANOBANANA_MODEL = 'gemini-3.1-flash-image-preview';

export type InlineImageData = {
  data: string;
  mimeType: string;
};

function parseDataUrl(dataUrl: string): InlineImageData | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

export async function resolveInlineImageData(imageUrl: string): Promise<InlineImageData> {
  const resolved = await readImageUrlAsBase64(imageUrl);
  return {
    mimeType: resolved.mimeType,
    data: resolved.base64,
  };
}

function extractInlineImage(response: any): InlineImageData | null {
  // 1. candidates[].content.parts[].inlineData パスを試行
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        console.log(`[nanobanana] image extracted via candidates path (mimeType=${part.inlineData.mimeType}, size=${part.inlineData.data.length})`);
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  // 2. SDK v1.45+ の response.data アクセサをフォールバックとして使用
  try {
    const directData = response?.data;
    if (typeof directData === 'string' && directData.length > 0) {
      // mimeType は candidates から取得を試みる
      const mimeType =
        candidates[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/png';
      console.log(`[nanobanana] image extracted via SDK data accessor (mimeType=${mimeType}, size=${directData.length})`);
      return { data: directData, mimeType };
    }
  } catch {
    // data アクセサが利用不可な場合は無視
  }

  // 3. コンテンツフィルタやブロックの理由をログ出力
  if (response?.promptFeedback) {
    console.warn('[nanobanana] prompt feedback:', JSON.stringify(response.promptFeedback));
  }
  const finishReason = candidates[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    console.warn(`[nanobanana] unexpected finishReason: ${finishReason}`);
  }
  console.warn('[nanobanana] no image data found in response');

  return null;
}

export async function generateNanobananaImage(ai: GoogleGenAI, prompt: string): Promise<InlineImageData | null> {
  console.log(`[nanobanana] generateImage start model=${NANOBANANA_MODEL} promptLength=${prompt.length}`);
  const startTime = Date.now();

  const response = await ai.models.generateContent({
    model: NANOBANANA_MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    config: {
      responseModalities: ['IMAGE'],
    },
  });

  const result = extractInlineImage(response);
  const elapsed = Date.now() - startTime;
  console.log(`[nanobanana] generateImage ${result ? 'success' : 'failed'} elapsed=${elapsed}ms`);
  return result;
}

export async function editNanobananaImage(
  ai: GoogleGenAI,
  sourceImage: InlineImageData,
  prompt: string
): Promise<InlineImageData | null> {
  console.log(`[nanobanana] editImage start model=${NANOBANANA_MODEL} sourceSize=${sourceImage.data.length} promptLength=${prompt.length}`);
  const startTime = Date.now();

  const response = await ai.models.generateContent({
    model: NANOBANANA_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: sourceImage.data,
              mimeType: sourceImage.mimeType,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE'],
    },
  });

  const result = extractInlineImage(response);
  const elapsed = Date.now() - startTime;
  console.log(`[nanobanana] editImage ${result ? 'success' : 'failed'} elapsed=${elapsed}ms`);
  return result;
}
