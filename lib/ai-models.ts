// Path: lib/ai-models.ts
// Title: AI Model Definitions (Hybrid Mode & Pricing)
// Purpose: Defines Hybrid Generation Modes and associated pricing for cost tracking.

import type { AIProviderName } from './ai-provider';

export interface AIModel {
  id: string;          // Identifier for the mode
  name: string;        // Display name
  description: string;
  provider: AIProviderName;
  plannerId: string;   // Model for topic suggestion
  generatorId: string; // Model for quiz generation
  imageModelId: string;
}

export const GEMINI_PRIMARY_TEXT_MODEL = "gemini-3.8-flash";
export const GEMINI_FALLBACK_TEXT_MODEL = "gemini-3.6-flash";
export const GEMINI_FALLBACK_LITE_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export const OPENAI_PRIMARY_TEXT_MODEL = "gpt-6-astra";
export const OPENAI_BALANCED_TEXT_MODEL = "gpt-5.6-terra";
export const OPENAI_LEGACY_FALLBACK_MODEL = "gpt-5.4-mini";
export const OPENAI_IMAGE_MODEL = "gpt-image-2";
export const MODEL_CATALOG_VERIFIED_AT = "2026-09-07";

export const AI_MODELS: AIModel[] = [
  {
    id: "hybrid-gemini38-flash",
    name: "Gemini 3.8 Flash (最新・高精度)",
    description: "Gemini 3.8 Flash と Nano Banana 2 を使用。日本語・英語・简体中文のクイズ生成と画像確認に対応します。",
    provider: "gemini",
    plannerId: GEMINI_PRIMARY_TEXT_MODEL,
    generatorId: GEMINI_PRIMARY_TEXT_MODEL,
    imageModelId: GEMINI_IMAGE_MODEL,
  },
  ...[
    { model: OPENAI_PRIMARY_TEXT_MODEL, label: "GPT-6 Astra", detail: "最上位の推論品質" },
    { model: "gpt-5.6-sol", label: "GPT-5.6 Sol", detail: "高精度な文章生成" },
    { model: OPENAI_BALANCED_TEXT_MODEL, label: "GPT-5.6 Terra", detail: "品質とコストのバランス" },
    { model: "gpt-5.6-luna", label: "GPT-5.6 Luna", detail: "軽量・低コスト" },
  ].map(({ model, label, detail }): AIModel => ({
    id: `hybrid-openai-${model}`,
    name: `OpenAI ${label} (${detail})`,
    description: `${label} と GPT Image 2 を使用。OpenAI APIキーと対象モデルへのアクセス権が必要です。`,
    provider: "openai",
    plannerId: model,
    generatorId: model,
    imageModelId: OPENAI_IMAGE_MODEL,
  })),
  {
    id: "hybrid-gemini37-flash",
    name: "Gemini 3.7 Flash (互換)",
    description: "Gemini 3.7 Flash を使用。以前のモデルを指定した既存設定との互換性を維持します。",
    provider: "gemini",
    plannerId: "gemini-3.7-flash",
    generatorId: "gemini-3.7-flash",
    imageModelId: GEMINI_IMAGE_MODEL
  },
  {
    id: "hybrid-gemini3.1-pro",
    name: "Gemini 3.1 Pro Preview (超高精度)",
    description: "Gemini 3.1 Pro Preview を使用。複雑な推論や高精度な文章品質を重視します。",
    provider: "gemini",
    plannerId: "gemini-3.1-pro-preview",
    generatorId: "gemini-3.1-pro-preview",
    imageModelId: GEMINI_IMAGE_MODEL
  },
  {
    id: "hybrid-gemini25-pro",
    name: "Gemini 2.5 Pro (高精度)",
    description: "Gemini 2.5 Pro を使用。安定した高精度モデルで、難しい問題生成に向いています。",
    provider: "gemini",
    plannerId: "gemini-2.5-pro",
    generatorId: "gemini-2.5-pro",
    imageModelId: GEMINI_IMAGE_MODEL
  },
  {
    id: "hybrid-gemini2-flash",
    name: "Gemini 2.5 Flash (高速)",
    description: "Gemini 2.5 Flash を使用。バランスの取れた高速モデルです。",
    provider: "gemini",
    plannerId: "gemini-2.5-flash",
    generatorId: "gemini-2.5-flash",
    imageModelId: GEMINI_IMAGE_MODEL
  },
  {
    id: "hybrid-gemini-flash-latest",
    name: "Gemini 3.5 Flash-Lite (標準)",
    description: "Gemini 3.5 Flash-Lite を使用。現行の軽量安定モデルで、高速かつ低コストです。",
    provider: "gemini",
    plannerId: GEMINI_FALLBACK_LITE_MODEL,
    generatorId: GEMINI_FALLBACK_LITE_MODEL,
    imageModelId: GEMINI_IMAGE_MODEL
  },
  {
    id: "hybrid-gemini25-flash-lite",
    name: "Gemini 2.5 Flash-Lite (軽量)",
    description: "Gemini 2.5 Flash-Lite を使用。2.5系の軽量安定モデルです。",
    provider: "gemini",
    plannerId: "gemini-2.5-flash-lite",
    generatorId: "gemini-2.5-flash-lite",
    imageModelId: GEMINI_IMAGE_MODEL
  },
  {
    id: "hybrid-openai-gpt5.5",
    name: "OpenAI GPT-5.5 (超高精度)",
    description: "GPT-5.5 と GPT Image 2 を使用。複雑な品質要件への追従を重視します。",
    provider: "openai",
    plannerId: "gpt-5.5",
    generatorId: "gpt-5.5",
    imageModelId: "gpt-image-2"
  },
  {
    id: "hybrid-openai-gpt5.4-mini",
    name: "OpenAI GPT-5.4 mini (高速)",
    description: "GPT-5.4 mini と GPT Image 2 を使用。品質と速度のバランスを重視します。",
    provider: "openai",
    plannerId: "gpt-5.4-mini",
    generatorId: "gpt-5.4-mini",
    imageModelId: "gpt-image-2"
  }
];

export const LEGACY_MODEL_ID_ALIASES: Record<string, string> = {
  "hybrid-gemini36-flash": "hybrid-gemini37-flash",
  "hybrid-gemini35-flash": "hybrid-gemini37-flash",
  "gemini-3-pro-preview": "gemini-3.1-pro-preview",
  "gemini-3.1-pro": "gemini-3.1-pro-preview",
  "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-flash-latest": GEMINI_PRIMARY_TEXT_MODEL,
  "gemini-2.0-flash": "gemini-2.5-flash",
  "imagen-4.0-generate-001": GEMINI_IMAGE_MODEL,
  "imagen-4.0-ultra-generate-001": GEMINI_IMAGE_MODEL,
  "imagen-4.0-fast-generate-001": GEMINI_IMAGE_MODEL,
};

// Pricing per 1,000,000 tokens (USD)
// Verified 2026-09-07: https://ai.google.dev/gemini-api/docs/pricing
// https://developers.openai.com/api/docs/models (standard text-token rates)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3.8-flash": { input: 1.50, output: 7.50 },
  "gemini-3.7-flash": { input: 1.50, output: 7.50 },
  "gemini-3.6-flash": { input: 1.50, output: 7.50 },
  "gemini-3.5-flash": { input: 1.50, output: 9.00 },
  "gemini-3.1-pro-preview": { input: 5.00, output: 30.00 },
  "gemini-3.5-flash-lite": { input: 0.30, output: 2.50 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.50 },
  "gemini-3-flash-preview": { input: 0.50, output: 3.00 },
  "gemini-3.1-flash-image": { input: 0.50, output: 3.00 },
  "gemini-2.5-pro": { input: 1.25, output: 10.00 },
  "gemini-2.5-flash": { input: 0.30, output: 2.50 },
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
  "gpt-6-astra": { input: 10.00, output: 50.00 },
  "gpt-5.6-sol": { input: 4.00, output: 20.00 },
  "gpt-5.6-terra": { input: 2.00, output: 12.00 },
  "gpt-5.6-luna": { input: 0.20, output: 1.20 },
  "gpt-5.5": { input: 5.00, output: 30.00 },
  "gpt-5.4-mini": { input: 0.75, output: 4.50 },
};

export const DEFAULT_MODEL_ID = "hybrid-gemini38-flash";

export function normalizeModelId(id: string) {
  return LEGACY_MODEL_ID_ALIASES[id] || id;
}

export function getModelById(id: string): AIModel {
  const normalizedId = normalizeModelId(id);
  return AI_MODELS.find(m => m.id === normalizedId)
    || AI_MODELS.find(m => m.generatorId === normalizedId)
    || AI_MODELS[0];
}

export function calculateEstimatedCost(modelId: string, inputTokens: number, outputTokens: number, at: Date = new Date()): number {
  const normalizedId = normalizeModelId(modelId);
  const apiModelId = AI_MODELS.find(model => model.id === normalizedId)?.generatorId || normalizedId;
  const introductoryRate = ['gemini-3.8-flash', 'gemini-3.7-flash'].includes(apiModelId)
    && at.getTime() < Date.parse('2027-01-01T00:00:00Z');
  const pricing = introductoryRate ? { input: 0.75, output: 3.75 } : MODEL_PRICING[apiModelId] || MODEL_PRICING[GEMINI_FALLBACK_LITE_MODEL] || MODEL_PRICING["gemini-2.5-flash-lite"];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
