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

export const GEMINI_PRIMARY_TEXT_MODEL = "gemini-3.7-flash";
export const GEMINI_FALLBACK_TEXT_MODEL = "gemini-3.6-flash";
export const GEMINI_FALLBACK_LITE_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export const AI_MODELS: AIModel[] = [
  {
    id: "hybrid-gemini37-flash",
    name: "Gemini 3.7 Flash (最新・高精度)",
    description: "Gemini 3.7 Flash を使用。現行の公開ドキュメント上の最新 stable Flash で、速度と高度な推論性能の両立を重視します。",
    provider: "gemini",
    plannerId: GEMINI_PRIMARY_TEXT_MODEL,
    generatorId: GEMINI_PRIMARY_TEXT_MODEL,
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
  "gemini-3.6-flash": GEMINI_PRIMARY_TEXT_MODEL,
  "gemini-2.0-flash": "gemini-2.5-flash",
  "imagen-4.0-generate-001": GEMINI_IMAGE_MODEL,
  "imagen-4.0-ultra-generate-001": GEMINI_IMAGE_MODEL,
  "imagen-4.0-fast-generate-001": GEMINI_IMAGE_MODEL,
};

// Pricing per 1,000,000 tokens (USD)
// Ref: https://ai.google.dev/pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
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
  "gpt-5.5": { input: 5.00, output: 30.00 },
  "gpt-5.4-mini": { input: 0.75, output: 4.50 },
};

export const DEFAULT_MODEL_ID = "hybrid-gemini37-flash";

export function normalizeModelId(id: string) {
  return LEGACY_MODEL_ID_ALIASES[id] || id;
}

export function getModelById(id: string): AIModel {
  const normalizedId = normalizeModelId(id);
  return AI_MODELS.find(m => m.id === normalizedId) || AI_MODELS[0];
}

export function calculateEstimatedCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const normalizedId = normalizeModelId(modelId);
  const pricing = MODEL_PRICING[normalizedId] || MODEL_PRICING[GEMINI_FALLBACK_LITE_MODEL] || MODEL_PRICING["gemini-2.5-flash-lite"];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
