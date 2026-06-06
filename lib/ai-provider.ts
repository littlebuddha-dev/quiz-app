import { GoogleGenAI } from '@google/genai';
import {
  editNanobananaImage,
  generateNanobananaImage,
  type InlineImageData,
} from './nanobanana';

export type AIProviderName = 'gemini' | 'openai';

export type AIUsage = {
  promptTokens: number;
  candidateTokens: number;
};

export type AITextResult = {
  text: string;
  model: string;
  provider: AIProviderName;
  usage: AIUsage;
};

type RuntimeEnv = Record<string, unknown> | undefined;

type GenerateTextParams = {
  model: string;
  prompt: string;
  systemInstruction?: string;
  image?: InlineImageData;
  env?: RuntimeEnv;
};

type GenerateImageParams = {
  provider: AIProviderName;
  model?: string;
  prompt: string;
  sourceImage?: InlineImageData;
  env?: RuntimeEnv;
};

export class AIProviderError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'AIProviderError';
    this.status = options?.status;
    this.code = options?.code;
  }
}

function readEnvValue(env: RuntimeEnv, key: string) {
  const envValue = env?.[key];
  if (typeof envValue === 'string' && envValue.trim()) {
    return envValue.trim();
  }

  const processValue = process.env[key];
  return typeof processValue === 'string' && processValue.trim() ? processValue.trim() : '';
}

export function inferAIProvider(modelId: string): AIProviderName {
  return /^(gpt-|o\d|chatgpt-|openai-)/i.test(modelId) ? 'openai' : 'gemini';
}

export function hasAIProvider(provider: AIProviderName, env?: RuntimeEnv) {
  return provider === 'openai'
    ? Boolean(readEnvValue(env, 'OPENAI_API_KEY'))
    : Boolean(readEnvValue(env, 'GEMINI_API_KEY'));
}

export function hasAnyAIProvider(env?: RuntimeEnv) {
  return hasAIProvider('gemini', env) || hasAIProvider('openai', env);
}

export function getDefaultImageModel(provider: AIProviderName) {
  return provider === 'openai'
    ? process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2'
    : process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image-preview';
}

function extractOpenAIText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const content = Array.isArray((item as Record<string, unknown>).content)
        ? ((item as Record<string, unknown>).content as unknown[])
        : [];
      return content.map((part) => {
        if (!part || typeof part !== 'object') return '';
        const record = part as Record<string, unknown>;
        return record.type === 'output_text' && typeof record.text === 'string' ? record.text : '';
      });
    })
    .filter(Boolean)
    .join('\n');
}

async function openAIRequest(
  path: string,
  init: RequestInit,
  env?: RuntimeEnv
) {
  const apiKey = readEnvValue(env, 'OPENAI_API_KEY');
  if (!apiKey) {
    throw new AIProviderError('OPENAI_API_KEY is not configured', {
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  }

  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AIProviderError(`OpenAI API error (${response.status}): ${body.slice(0, 800)}`, {
      status: response.status,
      code: response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'OPENAI_API_ERROR',
    });
  }

  return response;
}

async function generateOpenAIText(params: GenerateTextParams): Promise<AITextResult> {
  const content: Array<Record<string, unknown>> = [
    { type: 'input_text', text: params.prompt },
  ];
  if (params.image) {
    content.unshift({
      type: 'input_image',
      image_url: `data:${params.image.mimeType};base64,${params.image.data}`,
    });
  }

  const response = await openAIRequest(
    '/responses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        instructions: params.systemInstruction || undefined,
        input: [{ role: 'user', content }],
        max_output_tokens: 12000,
        text: { format: { type: 'json_object' } },
      }),
    },
    params.env
  );
  const payload = (await response.json()) as Record<string, unknown>;
  const usage = payload.usage && typeof payload.usage === 'object'
    ? (payload.usage as Record<string, unknown>)
    : {};

  return {
    text: extractOpenAIText(payload),
    model: params.model,
    provider: 'openai',
    usage: {
      promptTokens: Number(usage.input_tokens || 0),
      candidateTokens: Number(usage.output_tokens || 0),
    },
  };
}

async function generateGeminiText(params: GenerateTextParams): Promise<AITextResult> {
  const apiKey = readEnvValue(params.env, 'GEMINI_API_KEY');
  if (!apiKey) {
    throw new AIProviderError('GEMINI_API_KEY is not configured', {
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents = params.image
    ? [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: params.image.data,
                mimeType: params.image.mimeType,
              },
            },
            { text: params.prompt },
          ],
        },
      ]
    : params.prompt;
  const response = await ai.models.generateContent({
    model: params.model,
    contents,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: params.systemInstruction,
    },
  });

  return {
    text: response.text || '',
    model: params.model,
    provider: 'gemini',
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      candidateTokens: response.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

export async function generateAIText(params: GenerateTextParams): Promise<AITextResult> {
  const provider = inferAIProvider(params.model);
  return provider === 'openai'
    ? generateOpenAIText(params)
    : generateGeminiText(params);
}

function imageExtension(mimeType: string) {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

async function generateOpenAIImage(params: GenerateImageParams): Promise<InlineImageData | null> {
  const model = params.model || getDefaultImageModel('openai');
  let response: Response;

  if (params.sourceImage) {
    const form = new FormData();
    const sourceBytes = Buffer.from(params.sourceImage.data, 'base64');
    form.append(
      'image[]',
      new Blob([sourceBytes], { type: params.sourceImage.mimeType }),
      `source.${imageExtension(params.sourceImage.mimeType)}`
    );
    form.append('model', model);
    form.append('prompt', params.prompt);
    form.append('size', '1536x1024');
    form.append('quality', 'medium');
    form.append('output_format', 'png');
    response = await openAIRequest('/images/edits', { method: 'POST', body: form }, params.env);
  } else {
    response = await openAIRequest(
      '/images/generations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: params.prompt,
          size: '1536x1024',
          quality: 'medium',
          output_format: 'png',
        }),
      },
      params.env
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const data = payload.data?.[0]?.b64_json;
  return data ? { data, mimeType: 'image/png' } : null;
}

async function generateGeminiImage(params: GenerateImageParams): Promise<InlineImageData | null> {
  const apiKey = readEnvValue(params.env, 'GEMINI_API_KEY');
  if (!apiKey) {
    throw new AIProviderError('GEMINI_API_KEY is not configured', {
      code: 'AI_PROVIDER_UNAVAILABLE',
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  return params.sourceImage
    ? editNanobananaImage(ai, params.sourceImage, params.prompt)
    : generateNanobananaImage(ai, params.prompt);
}

export async function generateAIImage(params: GenerateImageParams): Promise<InlineImageData | null> {
  return params.provider === 'openai'
    ? generateOpenAIImage(params)
    : generateGeminiImage(params);
}

export function isRetryableAIError(error: unknown) {
  if (error instanceof AIProviderError) {
    return error.code === 'AI_PROVIDER_UNAVAILABLE' || error.status === 408 || error.status === 429 || (error.status || 0) >= 500;
  }

  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const status = Number(record.status || 0);
  const message = String(record.message || '');
  return status === 408
    || status === 429
    || status >= 500
    || message.includes('quota')
    || message.includes('RESOURCE_EXHAUSTED');
}
