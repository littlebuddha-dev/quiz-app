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

export const AI_MODELS: AIModel[] = [
  {
    id: "hybrid-gemini3.1-pro",
    name: "Gemini 3 Pro Preview (超高精度)",
    description: "Gemini 3 Pro Preview を使用。高精度で洗練されたクイズを生成します。",
    provider: "gemini",
    plannerId: "gemini-3-pro-preview",
    generatorId: "gemini-3-pro-preview",
    imageModelId: "gemini-3.1-flash-image-preview"
  },
  {
    id: "hybrid-gemini2-flash",
    name: "Gemini 2.5 Flash (高速)",
    description: "Gemini 2.5 Flash を使用。バランスの取れた高速モデルです。",
    provider: "gemini",
    plannerId: "gemini-2.5-flash",
    generatorId: "gemini-2.5-flash",
    imageModelId: "gemini-3.1-flash-image-preview"
  },
  {
    id: "hybrid-gemini-flash-latest",
    name: "Gemini 2.5 Flash-Lite (標準)",
    description: "Gemini 2.5 Flash-Lite を使用。安定した軽量モデルです。",
    provider: "gemini",
    plannerId: "gemini-2.5-flash-lite",
    generatorId: "gemini-2.5-flash-lite",
    imageModelId: "gemini-3.1-flash-image-preview"
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

// Pricing per 1,000,000 tokens (USD)
// Ref: https://ai.google.dev/pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3-pro-preview": { input: 1.25, output: 3.75 },
  "gemini-3.1-pro-preview": { input: 1.25, output: 3.75 },
  "gemini-2.5-flash": { input: 0.10, output: 0.40 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-2.5-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-flash-latest": { input: 0.075, output: 0.30 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gpt-5.5": { input: 5.00, output: 30.00 },
  "gpt-5.4-mini": { input: 0.75, output: 4.50 },
};

export const DEFAULT_MODEL_ID = "hybrid-gemini2-flash";

export function getModelById(id: string): AIModel {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}

export function calculateEstimatedCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[modelId] || MODEL_PRICING["gemini-1.5-flash"];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
