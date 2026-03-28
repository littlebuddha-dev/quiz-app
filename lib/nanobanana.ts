/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  return null;
}

export async function generateNanobananaImage(ai: GoogleGenAI, prompt: string): Promise<InlineImageData | null> {
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

  return extractInlineImage(response);
}

export async function editNanobananaImage(
  ai: GoogleGenAI,
  sourceImage: InlineImageData,
  prompt: string
): Promise<InlineImageData | null> {
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

  return extractInlineImage(response);
}
