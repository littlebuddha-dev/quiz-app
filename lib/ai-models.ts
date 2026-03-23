// Path: lib/ai-models.ts
// Title: AI Model Definitions (Hybrid Mode & Pricing)
// Purpose: Defines Hybrid Generation Modes and associated pricing for cost tracking.

export interface AIModel {
  id: string;          // Identifier for the mode
  name: string;        // Display name
  description: string;
  plannerId: string;   // Model for topic suggestion
  generatorId: string; // Model for quiz generation
}

export const AI_MODELS: AIModel[] = [
  {
    id: "hybrid-gemini3.1-pro",
    name: "Gemini 3 Pro Preview (超高精度)",
    description: "Gemini 3 Pro Preview を使用。高精度で洗練されたクイズを生成します。",
    plannerId: "gemini-3-pro-preview",
    generatorId: "gemini-3-pro-preview"
  },
  {
    id: "hybrid-gemini2-flash",
    name: "Gemini 2.5 Flash (高速)",
    description: "Gemini 2.5 Flash を使用。バランスの取れた高速モデルです。",
    plannerId: "gemini-2.5-flash",
    generatorId: "gemini-2.5-flash"
  },
  {
    id: "hybrid-gemini-flash-latest",
    name: "Gemini 2.5 Flash-Lite (標準)",
    description: "Gemini 2.5 Flash-Lite を使用。安定した軽量モデルです。",
    plannerId: "gemini-2.5-flash-lite",
    generatorId: "gemini-2.5-flash-lite"
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
