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
    id: "hybrid-gemini2-flash",
    name: "Gemini 2 + Nanobanana (高速)",
    description: "Gemini 2.0 Flashが計画し、Nanobanana 1.5 Flashが生成。速度重視。",
    plannerId: "gemini-2.0-flash",
    generatorId: "gemini-1.5-flash"
  },
  {
    id: "hybrid-gemini3-pro",
    name: "Gemini 3 + Nanobanana (高精度)",
    description: "Gemini 1.5 Proが高度な計画を行い、Nanobanana 1.5 Flashが生成。品質重視。",
    plannerId: "gemini-1.5-pro",
    generatorId: "gemini-1.5-flash"
  }
];

// Pricing per 1,000,000 tokens (USD)
// Ref: https://ai.google.dev/pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-1.5-pro": { input: 1.25, output: 3.75 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
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
